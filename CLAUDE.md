# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

The repo is a monorepo with two siblings at the root:

- `backend/` — Node.js + Express + MongoDB (Mongoose) API (this CLAUDE.md is about this app).
- `frontend/` — React (CRA) web client. Its `package.json` sets `"proxy": "http://localhost:3000"` so dev requests forward to the backend.

This branch is MongoDB-only. The MySQL implementation lives on a separate backup/reference branch.

All backend commands must be run from inside `backend/` (that's where `package.json` and `.env` live).

## Commands

- **Run the API server**: `cd backend && npm start` (or `node backend/src/index.js`). Listens on `PORT`, default `3000`. Boot fails fast if MongoDB Atlas is unreachable (no Mongo means no API).
- **Initialize / migrate the database**: `cd backend && npm run setup-mongo`. Runs idempotent setup: seeds reference data (Category, Port), bumps the auto-increment counters above any pre-existing IDs in migrated data, and (one-time) renames legacy `mysql*Id` fields from the dual-write branch into the canonical `*ID` shape. Safe to re-run.
- **Tests / lint**: none configured.

## Required local environment

Configuration comes from a `.env` file in `backend/` (loaded via `dotenv` in `backend/src/index.js`). Required keys:

- `Mongo_url` — MongoDB Atlas connection string (used by `src/Database/mongo_connection.js`). The connection pins `dbName: 'Takhlees'`.
- `SESSION_SECRET` — signing key for session cookies.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — file upload service.
- `PORT` — optional; defaults to `3000`.
- `NODE_ENV` — when `production`, the session cookie is marked `secure` (HTTPS only).

## Architecture

### Request flow

`src/index.js` → connects to MongoDB → `bootstrap()` in `src/app.controller.js` → mounts one Express router per domain at `/<domain>`.

`bootstrap()` is the single place that wires middleware (JSON body parser, `express-session` backed by `connect-mongo`), mounts routers, and installs the 404 + central error handler. Sessions roll on every request (`rolling: true`). A small middleware after `session()` inspects the `X-Client-Platform` header and chooses one of two windows per request:

- **Mobile** (header `X-Client-Platform: mobile`, set by `mobile/src/api.js` on every fetch): cookie `maxAge` stays at the default **1 year**. The mobile app stays signed in across long gaps between launches; only an explicit Sign-out or account deletion ends the session.
- **Web** (no header, browser fetch): cookie `maxAge` is overridden per request to the historical **30-minute** rolling window.

Cookies are `httpOnly` and `sameSite: 'lax'` (or `'none'` in production for cross-site Vercel→Render auth). The session store creates a `sessions` collection in MongoDB on first boot with a TTL index that auto-prunes expired sessions, and `touchAfter: 60` throttles the rolling-session writes to at most once a minute per session.

### Module convention (controller / service split)

Each domain under `src/modules/<name>/` has exactly two files:

- `<name>_controller.js` — defines the Express `Router` and maps HTTP verbs to service functions. Thin; no logic.
- `<name>_service.js` — exports the handler functions (`(req, res, next) => ...`) that read/write through Mongoose models.

Despite the names, **services are the request handlers** (controllers in the conventional MVC sense). When adding a route, add it to `_controller.js` and the handler to `_service.js`; don't introduce a third file.

### Database layer

- `src/Database/mongo_connection.js` exports `connectMongo()` and the shared `mongoose` default. `src/index.js` awaits `connectMongo()` before serving the first request — boot fails loudly on a misconfigured connection string instead of letting the first write blow up mid-request.
- `src/Database/mongo/*.mongo.js` files each export one Mongoose model. They register schemas on import; collections are auto-created on first write. Models are imported directly by services.
- `src/Database/mongo/counters.js` — `nextId(name)` mints the next public integer ID for a domain (UserID, CompanyID, ApplicationID, …) via an atomic `$inc` on a `counters` collection. Every insert that needs a numeric public ID goes through this helper. `ensureCounterAtLeast(name, floor)` is used by `setup_mongo.js` so counters always sit above the highest ID present in migrated data.
- `src/Database/setup_mongo.js` is the bootstrap script: rename legacy `mysql*Id` fields → `*ID`, seed reference data (Category / Port), then bump every counter above the max migrated ID. Idempotent.
- Multi-document writes that need atomicity use `mongoose.startSession()` + `session.withTransaction(...)` (e.g. `deleteProfile` in `user_service.js`).

### ID model

Each domain exposes a numeric public ID field (`UserID`, `CompanyID`, `ApplicationID`, `CategoryID`, `PortID`, `ReviewID`, `TicketID`, `CompanyPaymentID`) plus embedded `DocumentID` / `PaymentID` on Application. These IDs are minted by `counters.js`, indexed `unique`, and are what the React frontend uses in URL params and request bodies. MongoDB's native `_id` (ObjectId) is kept for internal Mongo storage but is not part of the API contract.

### User model: single-collection inheritance

`User` is one collection. The `Type` field (`'C'` or `'A'`) selects which embedded subdoc is populated:

- `client` subdoc carries `PhoneNumber`, `NationalID`, `Address` (client variant)
- `admin` subdoc carries `LastLogin` (admin variant)

`sanitizeUser()` in `user_service.js` flattens the doc into the legacy response shape (top-level `PhoneNumber`/`NationalID`/`Address`/`LastLogin`) and strips `Password`. Reuse it rather than writing ad-hoc projections. The schema also defines a `toJSON` transform that strips `Password` whenever a User doc is serialized directly.

### Company model and embedded join data

`Company` columns: `CompanyID` (number, unique), `Name`, `ContactEmail`, `FoundingDate`, `Password` (bcrypt), `Comm` (number, percentage), `RegistrationDate`, `TaxNumber`, `VerficationStatus` (`'Pending'|'Verified'|'Rejected'`), plus the optional profile fields `ComReg`, `Governorate`, `Address`, `About`, `LogoUrl`, and `PdfExportCount`.

`Company.ports[]` and `Company.categories[]` are **embedded** subdoc arrays — they used to be MySQL join tables (`CompanyPort`, `CompanyCategory`) and have been folded into the parent doc since they're bounded (a handful per company) and always read with the company. The `/companyport` and `/companycategory` modules still exist as separate routes and present a row-oriented API for the frontend, but their handlers manipulate Company's embedded arrays directly.

### Application model and embedded children

`Application` embeds `documents[]` and `payments[]` arrays — Document and Payment used to be their own SQL tables but are never queried independently of their parent Application, so they live as subdocs. `/document` and `/payment` routes still exist with the legacy row-oriented API; their handlers operate on Application's embedded arrays via positional-`$` updates and `$push`/`$pull`.

Each Application doc also carries denormalized snapshot subdocs (`client`, `company`, `category`, `port`) so list views render without per-row lookups. Snapshots are refreshed by fan-out `updateMany()` when the referenced parent doc changes (see `updateProfile` in `user_service.js`, `updateCompanyProfile` in `company_service.js`, `updateCategory` / `updatePort`).

### Standalone collections

- `Review` — its own collection; aggregated per-company (rating displays) and per-category (browse pages), so embedding under Application would force fan-scans.
- `SupportTicket` — its own collection; listed independently of User (admin queue), grows unbounded per user.
- `CompanyPayment` — commission ledger; rows grow unbounded and admin reports scan across companies by date range.

All three carry denormalized snapshot subdocs for the same reason as Application.

### Auth and sessions

- Passwords are bcrypt-hashed (`SALT_ROUNDS = 10`) on `register` and on `updateUser` when a new `Password` is supplied; `login` uses `bcrypt.compare`. Password rules (min 8 chars, at least one letter and one number) live in `validatePassword()` in `user_service.js` and are enforced by both endpoints.
- Successful login stores `req.session.userId` and `req.session.role` (`'admin'` for `User.Type === 'A'`, otherwise `'client'`). Company login stores `req.session.companyId` and `req.session.role === 'company'`.
- Auth middleware lives in `src/middleware/auth.js`: `requireAuth` (user session), `requireAdmin` (admin session), `requireCompany` (company session), `requireSession` (either). Apply per-route — they are not mounted globally.
- `POST /user/login` and `POST /company/login` are rate-limited to 5 requests/minute per IP via `express-rate-limit`.
- `onlineUsers` queries the `sessions` collection directly (`find({ expires: { $gt: new Date() } })`), parses the session blob, and looks up the corresponding User docs by `UserID`. This couples the handler to `connect-mongo`'s schema — if the session store is swapped, this endpoint must be rewritten.

### Error handling

- Central error middleware lives in `src/middleware/errorHandler.js` and is mounted last in `bootstrap()`. It logs and returns `{ ok: false, error: <message> }` with `err.status` (default 500).
- New handlers should `return next(err)` (or just throw — Express 5 forwards async-handler rejections automatically) instead of writing their own 500 responses. Every handler uses `try { ... } catch (err) { return next(err); }`.

### Style notes worth knowing

- All services use `async/await` with Mongoose. There are no callback-based DB calls in this branch.
- Update endpoints follow a **read-then-write** pattern: load the existing doc, fall back to existing values for any field not present in the request body, then `updateOne`. Preserve this when extending — partial PUTs must not null out untouched columns.
- `searchUser` whitelists column names against `allowedColumns` before using them as Mongo field selectors. Any new search-by-column endpoint must do the same; never let user input pick the query field unchecked.
- For UI list views, denormalized snapshot subdocs (`Application.company`, `Application.client`, etc.) replace SQL JOINs. When you add a new write path that mutates a parent doc (Company name, Category type, etc.), fan out an `updateMany()` to keep the snapshots fresh.
