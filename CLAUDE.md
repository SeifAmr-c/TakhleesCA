# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Run the API server**: `npm start` (or `node src/index.js`). Listens on `PORT`, default `3000`.
- **Initialize / migrate the database**: `node src/Database/setup_db.js` — creates the `Takhlees` database (if missing) and all tables in dependency order. Idempotent (`CREATE TABLE IF NOT EXISTS`). Run this once before first use and after pulling schema changes.
- **Tests / lint**: none configured.

## Required local environment

Configuration comes from a `.env` file at the project root (loaded via `dotenv` in `src/index.js` and `src/Database/setup_db.js`). See `.env.example` for the full list. Required keys:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — MySQL connection (used by both `src/Database/connection.js` and the `express-mysql-session` store in `src/app.controller.js`).
- `SESSION_SECRET` — signing key for session cookies.
- `PORT` — optional; defaults to `3000`.
- `NODE_ENV` — when `production`, the session cookie is marked `secure` (HTTPS only).

## Architecture

### Request flow

`src/index.js` → `bootstrap()` in `src/app.controller.js` → mounts one Express router per domain at `/<domain>`.

`bootstrap()` is the single place that wires middleware (JSON body parser, `express-session` backed by `express-mysql-session`), mounts routers, and installs the 404 + central error handler. Session cookies have a 30-minute `maxAge` and are `httpOnly` + `sameSite: 'lax'`; the session store auto-creates a `sessions` table in MySQL on first boot (`createDatabaseTable: true`).

### Module convention (controller / service split)

Each domain under `src/modules/<name>/` has exactly two files:

- `<name>_controller.js` — defines the Express `Router` and maps HTTP verbs to service functions. Thin; no logic.
- `<name>_service.js` — exports the handler functions (`(req, res, next) => ...`) that talk to MySQL.

Despite the names, **services are the request handlers** (controllers in the conventional MVC sense). When adding a route, add it to `_controller.js` and the handler to `_service.js`; don't introduce a third file.

### Database layer

- `src/Database/connection.js` exports a `db` object backed by a `mysql2/promise` connection pool. `db.query(sql, params, cb)` is a callback-style shim over the pool so existing callback-style services keep working unchanged; `db.pool` exposes the raw promise pool for transactions (`getConnection()` / `beginTransaction()`).
- `src/Database/*.model.js` files each export a `create<Name>Table()` function that issues `CREATE TABLE IF NOT EXISTS` (and occasionally `ALTER TABLE` to evolve columns — see `client.model.js`). They are pure DDL helpers, not data-access objects.
- `src/Database/setup_db.js` orchestrates table creation in FK-dependency order: `User` → `Client`/`Admin` → `SupportTicket` → `Company` → `Port`/`CompanyPort` → `Category`/`CompanyCategory` → `Application` → `Review`/`Document`/`Payment`/`CompanyPayment`. Preserve this order if adding new tables with FKs. The script first opens a bootstrap connection without selecting a database, runs `CREATE DATABASE IF NOT EXISTS Takhlees`, then dynamically imports each `*.model.js` (so `connection.js`'s pool — which pins `database: 'Takhlees'` — only initializes after the DB exists).
- Multi-statement writes (`register`, `deleteUser`) use `db.pool.getConnection()` + `beginTransaction` / `commit` / `rollback`. Follow the same pattern for any new write that touches more than one table.

### User model: single-table inheritance

`User` is the base table; `Client` and `Admin` are 1:1 child tables whose PK is also a FK to `User.UserID`. `User.Type` is `'C'` or `'A'` and selects which child row to read/write.

- `register` (`user_service.js`) inserts into `User` then into either `Client` (with `PhoneNumber`, `NationalID`, `Address`) or `Admin` (with `LastLogin = NOW()`), based on `Type`. Both inserts run inside a transaction.
- Most user reads use `userSelectSql` — a `LEFT JOIN` of `User` + `Client` + `Admin` — and pass results through `sanitizeUser()` to strip `Password`. Reuse these helpers rather than writing ad-hoc joins.
- `deleteUser` removes the row from `Client`, `Admin`, and `User` in one transaction (Client/Admin first to satisfy the FK).

### Company model and associative tables

- `Company` columns: `CompanyID` (PK), `Name`, `ContactEmail`, `FoundingDate`, `Password` (bcrypt), `Comm DECIMAL(4,2)`, `RegistrationDate`, `TaxNumber`, `VerficationStatus ENUM('Pending','Verified','Rejected')`, plus the optional profile fields `ComReg VARCHAR(255)`, `Governorate VARCHAR(20)`, `Address VARCHAR(255)`, `About VARCHAR(255)` (all nullable). `createCompany` and `updateCompany` (`company_service.js`) accept these four fields; `updateCompany` follows the read-then-write pattern.
- Two associative entities link `Company` to other tables — both use composite PKs that are also FKs and follow the same service/controller shape (`create`, `get` with one-or-both-IDs filtering, `search` with whitelisted columns, `delete`; `CompanyCategory` also has `update` for `Price`):
  - `CompanyPort (CompanyID, PortID)` — mounted at `/companyport`.
  - `CompanyCategory (CompanyID, CategoryID, Price DECIMAL(7,2) NOT NULL)` — mounted at `/companycategory`. Composite-key fields are not editable via `PUT`; only `Price` is.

### Auth and sessions

- Passwords are bcrypt-hashed (`SALT_ROUNDS = 10`) on `register` and on `updateUser` when a new `Password` is supplied; `login` uses `bcrypt.compare`. Password rules (min 8 chars, at least one letter and one number) live in `validatePassword()` in `user_service.js` and are enforced by both endpoints.
- Successful login stores `req.session.userId` and `req.session.role` (`'admin'` for `User.Type === 'A'`, otherwise `'client'`).
- Auth middleware lives in `src/middleware/auth.js`: `requireAuth` (401 if no session) and `requireAdmin` (403 if `role !== 'admin'`). Apply per-route — they are not mounted globally. Example: `router.get('/online', requireAuth, userService.onlineUsers)`.
- `POST /user/login` is rate-limited to 5 requests/minute per IP via `express-rate-limit` (defined in `user_controller.js`). Other routes are unrestricted.
- `onlineUsers` reads the `sessions` table directly (`SELECT data FROM sessions WHERE expires > UNIX_TIMESTAMP()`), JSON-parses the session blob, and joins back to `User`. This couples the handler to `express-mysql-session`'s schema — if the session store is swapped, this endpoint must be rewritten.

### Error handling

- Central error middleware lives in `src/middleware/errorHandler.js` and is mounted last in `bootstrap()`. It logs and returns `{ ok: false, error: <message> }` with `err.status` (default 500).
- New handlers should `return next(err)` (or just throw — Express 5 forwards async-handler rejections automatically) instead of writing their own 500 responses. Migration is partial: `register`, `login`, `onlineUsers`, and `deleteUser` already use the central handler; older handlers (`getUser`, `updateUser`, `updateClient`, `updateAdmin`, `searchUser`, and most non-user services) still build their own 500s. When touching one of those, prefer migrating it.

### Style notes worth knowing

- The codebase mixes two async styles: most services use raw `db.query(sql, params, cb)` callbacks; `user_service.js` defines a local `runQuery` Promise wrapper. Match the surrounding style of the file you're editing.
- Update endpoints (`updateUser`, `updateClient`) follow a **read-then-write** pattern: `SELECT` the existing row, fall back to existing values for any field not present in the request body, then `UPDATE`. Preserve this when extending — partial PUTs must not null out untouched columns.
- `searchUser` whitelists column names against `allowedColumns` before interpolating into SQL. Any new search-by-column endpoint must do the same; never interpolate user input into SQL identifiers without a whitelist.