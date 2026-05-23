# Takhlees — Arabic / English (i18n) Implementation Plan

> Status: **planning only — no code changes yet**
> Stack: React 19 (CRA) · Node.js + Express · MongoDB (Mongoose)
> Branch: `seif`

---

## Table of contents

1. [Current architecture assumptions](#0-current-architecture-assumptions)
2. [Overall architecture](#1-overall-architecture-for-multilingual-support)
3. [Translation storage in MongoDB](#2-translation-storage-in-mongodb)
4. [Recommended schema structure](#3-recommended-schema-structure)
5. [Backend changes required](#4-backend-changes-required)
6. [Frontend changes required](#5-frontend-changes-required)
7. [Language switching system design](#6-language-switching-system-design)
8. [RTL/LTR handling strategy](#7-rtl--ltr-handling-strategy)
9. [Cairo font integration strategy](#8-cairo-font-integration-strategy)
10. [localStorage usage](#9-localstorage-usage)
11. [Safe migration of existing components/pages](#10-safe-migration-of-existing-componentspages)
12. [Folder structure recommendations](#11-folder-structure-recommendations)
13. [Reusable translation system approach](#12-reusable-translation-system-approach)
14. [Potential issues / conflicts and how to avoid them](#13-potential-issues--conflicts-and-how-to-avoid-them)
15. [Scalability for more languages later](#14-scalability-for-more-languages-later)
16. [Implementation phases (safest order)](#15-implementation-phases-safest-order)
17. [Which files to modify first](#16-which-files-to-modify-first)
18. [What to test after each phase](#17-what-to-test-after-each-phase)
19. [Performance considerations](#18-performance-considerations)
20. [SEO considerations for Arabic](#19-seo-considerations-for-arabic)
21. [Final migration strategy](#20-final-migration-strategy-zero-downtime-no-breakage)
22. [Pre-Phase 1 inventory](#pre-phase-1-inventory)
23. [Migration checklist](#migration-checklist-gates-before-any-code-change)
24. [Open questions](#open-questions-before-coding-starts)

---

## 0. Current architecture assumptions

- **Frontend**: CRA + React 19, single `App.jsx` with `BrowserRouter`, ~25 page components under `pages/{public,auth,client,company,admin}`, shared `components/`, single `styles/theme.css`. No global provider beyond what `App.jsx` mounts.
- **Backend**: Express, MongoDB via Mongoose. Reference data (`Category`, `Port`) has **single string name fields** today, plus denormalized snapshots embedded inside `Application`, `Review`, `SupportTicket`, `CompanyPayment`.
- **Companies / users** carry user-entered text (`Name`, `About`, `Address`, `Governorate`) — most of this is user-typed and won't be translated by us; only **system reference data** (categories, ports, governorates if seeded) is curated by Takhlees and must exist in both languages.
- **Mobile** app hits the same API with `X-Client-Platform: mobile`. Plan must not break it.
- **No tests / lint** configured. Verification is manual.

These shape the plan: we need (a) a UI-string layer that lives entirely in the frontend, and (b) a *narrow* DB schema change covering only the curated reference fields, with a backwards-compatible API.

---

## 1. Overall architecture for multilingual support

Three layers, each with one clear job:

| Layer | What it translates | How |
|---|---|---|
| **UI strings** (buttons, labels, errors, page copy) | Static text we author | `react-i18next` + JSON resource files in `frontend/src/i18n/locales/{en,ar}.json` |
| **System reference data** (Category names, Port names, etc.) | Curated bilingual content in DB | `{ en, ar }` object fields on the model; API returns the active language |
| **User-generated content** (Company name, About, Address, user messages) | Not translated | Stored as-is; rendered as-is. Out of scope for i18n. |

Language is chosen by a single source of truth — the `LanguageProvider` — which reads from (in order) `localStorage` → `navigator.language` → `'en'`, and writes back to `localStorage` on change. Every other piece (i18next, `<html dir>`, fetch `Accept-Language` header, Cairo font activation) reacts to that provider.

**Library choice — `react-i18next`** (not roll-your-own). Reasons:
- Battle-tested, ~10 KB gzipped, native namespace + lazy-load support.
- Plays well with React 19 and CRA out of the box.
- `Trans` component handles inline `<strong>`/`<a>` inside a sentence (critical when AR word order flips).
- Plural & interpolation rules are already correct for Arabic (which has 6 plural forms).

Rolling our own context would be ~50 lines but loses pluralization, namespacing, missing-key fallbacks, and the `Trans` component — all of which we'd reinvent badly.

---

## 2. Translation storage in MongoDB

Only **curated** reference data goes bilingual. Concretely:

- `Category.Type` → becomes `Category.Name: { en: String, ar: String }`
- `Port.PortName` → becomes `Port.PortName: { en: String, ar: String }`
- If we later seed a `Governorate` collection, same shape.

User-typed content (`Company.Name`, `Company.About`, `User.Address`, etc.) stays as plain strings. We are not building a translation service for company copy; companies can write bilingually in their own About field if they choose.

**Snapshot embedded copies** (`Application.category`, `Application.port`, `Review.category` …) follow the same shape — the snapshot itself becomes `{ id, name: { en, ar } }`. The existing `updateMany()` fan-out paths already handle propagation when a category/port is edited; we extend those queries to fan out both languages.

---

## 3. Recommended schema structure

```js
// Localized string subschema — reused everywhere
const LocalizedStringSchema = new mongoose.Schema({
  en: { type: String, required: true, trim: true },
  ar: { type: String, required: true, trim: true },
}, { _id: false });

// Category
{
  CategoryID: Number,         // unchanged
  Name: LocalizedStringSchema // was: Type: String
}

// Port
{
  PortID: Number,             // unchanged
  PortName: LocalizedStringSchema // was: PortName: String
}

// Application.category / Application.port snapshots
category: { CategoryID: Number, Name: { en, ar } }
port:     { PortID: Number,     PortName: { en, ar } }
```

A request-scoped helper `localize(doc, lang)` flattens `{ en, ar }` to a single string when serializing API responses, so the response shape stays the same as today (`category.Name === "Customs Clearance"`) and the React frontend doesn't need a special renderer for DB strings.

---

## 4. Backend changes required

1. **Language detection middleware** (`src/middleware/language.js`)
   - Read `Accept-Language` header (web sets it via axios) or `?lang=ar` query.
   - Sets `req.lang ∈ {'en', 'ar'}`, default `'en'`.
   - Mounted globally in `bootstrap()` after `session()`.

2. **`localize()` utility** (`src/utils/localize.js`)
   - Walks a doc/array and replaces every `LocalizedString` with the string for `req.lang`, falling back to `en` if `ar` is missing.
   - Used by services right before `res.json(...)`.

3. **Schema migration** (`src/Database/setup_mongo.js`, idempotent)
   - Detect old `Category.Type: String` → rewrite to `Name: { en: oldValue, ar: oldValue }` (AR initially mirrors EN; admin fills in real AR via the admin UI).
   - Same for `Port.PortName: String`.
   - Fan out to `Application.category` / `Application.port` snapshots, plus the other snapshot collections (`Review`, embedded `Company.categories[]` / `Company.ports[]`).
   - Guarded: only runs if `typeof doc.Name === 'string'`. Re-running is a no-op.

4. **CRUD endpoints for categories/ports** accept `{ Name: { en, ar } }` on create/update. The fan-out `updateMany()` is extended to set both languages on snapshots.

5. **No change** to user/company/auth services, since their text fields stay monolingual.

6. **Validation errors** — keep returning English message codes (e.g. `"INVALID_PASSWORD"`); frontend maps codes → translated text. Cleaner than translating server-side and avoids drift.

---

## 5. Frontend changes required

1. Add deps: `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
2. New `frontend/src/i18n/` folder.
3. Wrap `<App />` in `main.jsx` with `<LanguageProvider>` which:
   - Initializes i18next.
   - Reads `localStorage.getItem('app:lang')`.
   - Sets `<html lang>` and `<html dir>`.
   - Exposes `useLanguage()` hook returning `{ lang, setLang, dir, t }`.
4. Add `Accept-Language` header in every axios call (single edit in `frontend/src/api/*.js` — they share an axios instance via `api/client.js`).
5. Replace hard-coded strings in pages/components with `t('namespace.key')`. Done page by page — incremental and safe.
6. Add a **Language Switcher** to `PublicLayout` (and into client/company/admin chrome) — a two-button segmented control `EN | ع`.
7. Update `theme.css` to use **CSS logical properties** (`margin-inline-start` instead of `margin-left`, etc.) where alignment matters. Most of the rest works for free.

---

## 6. Language switching system design

- A single React Context (`LanguageProvider`) is the only owner.
- Switcher calls `setLang('ar')` →
  1. `i18next.changeLanguage('ar')` (rerenders all `t()` consumers).
  2. `document.documentElement.setAttribute('dir', 'rtl')`
  3. `document.documentElement.setAttribute('lang', 'ar')`
  4. `localStorage.setItem('app:lang', 'ar')`
  5. axios default header updated: `Accept-Language: ar`.
- No page reload required.
- URL stays the same (no `/ar/...` prefix). Rationale: simpler, no broken bookmarks, no router refactor. We can add URL-based locale later for SEO if it becomes a priority.

---

## 7. RTL / LTR handling strategy

- **One toggle, one rule**: `<html dir="rtl">` flips the entire document automatically thanks to CSS logical properties.
- **Migrate `theme.css` and component CSS** from physical → logical properties:
  - `padding-left` → `padding-inline-start`
  - `margin-right` → `margin-inline-end`
  - `text-align: left` → `text-align: start`
  - `border-left` → `border-inline-start`
  - `left: 0` (in absolute positioning) → `inset-inline-start: 0`
- **Don't flip everything**: keep LTR for code blocks, phone numbers (use `<bdi>`), and numeric IDs.
- **Icons**: only flip directional icons (`chevron-right`, arrows). Use `[dir="rtl"] .icon-flip { transform: scaleX(-1); }` and apply `icon-flip` per-icon, not globally — flipping the logo or check marks looks broken.
- **Grids / flex** are direction-agnostic when using `gap` + `flex-direction: row` (which respects writing direction).
- **Maps / charts / Cloudinary uploads / Easy-crop** — unaffected, they're visual content.

---

## 8. Cairo font integration strategy

- Self-host via `@fontsource/cairo` — no external request, GDPR-friendly.
- Apply only when `lang === 'ar'`:
  ```css
  html[lang="ar"] body { font-family: "Cairo", "IBM Plex Sans", system-ui, sans-serif; }
  html[lang="en"] body { /* current IBM Plex stack */ }
  ```
- Preload the 400 + 600 weights, subset to Arabic + Latin (Cairo ships Latin glyphs too, so EN inside an AR page still looks coherent).
- Keep `font-variant-numeric: tabular-nums` for both (tables look bad otherwise).
- **Don't** load Cairo if the user never switches — gate the import behind first language change so EN-only users skip the download.

---

## 9. localStorage usage

Exactly one key: **`app:lang`** with value `'en'` or `'ar'`.

- **Write**: every time `setLang()` is called.
- **Read**: once on app boot inside `LanguageProvider`.
- **Never read elsewhere** — components ask `useLanguage()` instead, so localStorage stays a boot-only concern.

No other i18n state goes into localStorage (no per-page overrides, no last-visited-language-by-route — keep it boring).

---

## 10. Safe migration of existing components/pages

The migration is **strictly additive** and per-file. The app keeps running with mixed translated/untranslated pages during the rollout.

1. Add the i18n infrastructure with **empty resource bundles + English fallback** — every `t('foo')` that has no translation yet renders the English literal you passed as the default. Nothing breaks.
2. For each page, in this order: extract literals → add to `en.json` → add AR counterpart → swap JSX. Commit per page.
3. Untouched pages keep working in EN; if a user switches to AR before they're migrated, they see English text on those pages (acceptable transitional state).
4. **No file is moved or renamed.** Only string contents change. This makes review trivial and `git blame` clean.

---

## 11. Folder structure recommendations

```
frontend/src/
  i18n/
    index.js                 # i18next init + LanguageProvider + useLanguage hook
    locales/
      en/
        common.json          # buttons, generic labels, validation
        auth.json            # login/register/forgot
        landing.json         # public marketing pages
        client.json          # client dashboard, applications, tracking
        company.json         # company dashboard / profile
        admin.json           # admin pages
        errors.json          # backend error code → message
        legal.json           # privacy + terms long-form
      ar/
        common.json
        ...                  # same keys, AR values
    languageDetector.js      # localStorage + navigator fallback
```

**Backend** stays flat:
```
backend/src/
  middleware/
    language.js              # NEW
  utils/
    localize.js              # NEW
  Database/mongo/
    _shared.js               # NEW — exports LocalizedStringSchema
```

---

## 12. Reusable translation system approach

- **Hook**: `const { t } = useTranslation('client')` per component, namespace pinned to that page's domain. One namespace per file is the rule.
- **Component for rich text**: `<Trans i18nKey="company.invite" components={{ b: <strong/>, link: <a href="..."/> }}>` — handles word reordering in AR safely.
- **Format helpers** (in `i18n/index.js`):
  - `formatDate(d, lang)` — `Intl.DateTimeFormat(lang, …)`.
  - `formatNumber(n, lang)` — `Intl.NumberFormat`. Latin digits in both languages recommended.
  - `formatCurrency(n, lang)` — `Intl.NumberFormat(lang, { style: 'currency', currency: 'EGP' })`.
- **Validation messages**: backend returns codes (e.g. `INVALID_PHONE`); frontend maps via `t(\`errors.\${code}\`)`. Single source of truth for both languages.

---

## 13. Potential issues / conflicts and how to avoid them

| Risk | Mitigation |
|---|---|
| Hard-coded text inside `alert()` / `confirm()` / `toast` calls | Audit globally; everything goes through `t()`. |
| Concatenated strings (`"Hello " + name + "!"`) — breaks in AR word order | Use interpolation: `t('greeting', { name })`. |
| Existing CSS uses physical properties (`padding-left`) | Codemod once, then enforce by code review. Stylelint rule optional. |
| Mobile app reads the same API → snapshot shape changes from `String` to `{en,ar}` | Backend `localize()` always returns a plain string to the client. Mobile sends its own `Accept-Language` (default `en`) — no mobile-side change required to keep working. |
| Form inputs in AR with LTR data (emails, phones) | Wrap with `dir="ltr"` on the input itself or `<bdi>` in display. |
| `Trans` component misuse — devs sometimes nest JSX inside `t()` | Document the rule; only `<Trans>` interpolates JSX. |
| Translation drift (EN updated, AR not) | CI check `scripts/i18n-diff.js` that flags missing keys between locales. |
| Cairo font flash on switch | Preload + `font-display: swap`. Acceptable trade-off. |
| Snapshot back-fill of existing Categories/Ports | One-time migration step inside `setup_mongo.js`; idempotent. |

---

## 14. Scalability for more languages later

The architecture has **one branch point per language**, all in pure data:

- A new locale = new `locales/<code>/*.json` files. No code touched.
- DB `LocalizedString` is a subdoc — adding a third key (`fr`, `ur`) is a non-breaking schema change. `localize()` reads `doc[req.lang] || doc.en`, so missing translations gracefully fall back.
- Language switcher reads from a single `SUPPORTED_LANGUAGES` array — adding a code adds the button.

The only non-trivial work would be RTL-specific (e.g. Hebrew/Urdu) but RTL is already a solved case here; LTR-additions are zero-effort.

---

## 15. Implementation phases (safest order)

> Each phase ends in a green deploy. The app stays usable throughout.

**Phase 1 — Infra, no UI change** (lowest risk)
- Add i18next deps.
- Create `i18n/` folder with empty AR files (EN files contain current strings).
- Wrap `<App/>` with provider. With no translations yet, page renders identically (English fallbacks).
- Add language switcher hidden behind a feature flag (`?lang=ar`) for manual testing.

**Phase 2 — RTL plumbing**
- Convert `theme.css` to logical properties.
- Add `[dir="rtl"]` overrides where logical props can't cover (icons, transforms).
- Verify EN still looks identical.

**Phase 3 — Cairo & switcher UI**
- Add Cairo font, dynamic-loaded on AR.
- Reveal the language switcher in `PublicLayout` and authed layouts.

**Phase 4 — Public pages translated**
- Landing, About, Contact, Browse, Privacy, Terms.

**Phase 5 — Auth pages translated**
- Login/Register for both user and company. Includes validation errors (introduce error-code mapping).

**Phase 6 — Backend reference-data bilingual**
- Migrate `Category.Type` → `Category.Name: {en,ar}`, same for `Port`.
- Update `setup_mongo.js`, services, snapshot fan-outs.
- Add admin UI fields to edit AR versions.

**Phase 7 — Client / Company / Admin pages translated**
- One page per commit.

**Phase 8 — Polish**
- Audit alerts/confirms/toasts.
- Run i18n-diff CI check.
- QA pass in AR with native speaker.

---

## 16. Which files to modify first

In phase order:

1. `frontend/package.json` — add deps.
2. `frontend/src/i18n/index.js`, `i18n/locales/en/common.json`, `i18n/locales/ar/common.json` — new.
3. `frontend/src/main.jsx` — wrap with provider.
4. `frontend/src/api/client.js` — inject `Accept-Language`.
5. `frontend/src/styles/theme.css` — logical properties pass.
6. `frontend/src/components/PublicLayout.jsx` — drop in the switcher.
7. `frontend/src/index.css` — Cairo font stack rule under `html[lang="ar"]`.

Only then do backend files change (`Database/mongo/category.mongo.js`, `port.mongo.js`, `setup_mongo.js`, services, new `middleware/language.js`, `utils/localize.js`).

---

## 17. What to test after each phase

| Phase | Manual checks |
|---|---|
| 1 | App renders identically to today in EN. No console errors. |
| 2 | All pages still look right in EN. `<html dir="rtl">` via DevTools mirrors layout cleanly (no overlaps, no clipped text). |
| 3 | Switcher toggles font + direction without reload; refresh persists choice; opening a new tab keeps choice. |
| 4 | Public pages in AR read naturally; word-wrap and line-height OK at 320 px, 768 px, 1440 px. |
| 5 | Login validation messages translate; invalid email in AR shows AR text. |
| 6 | Existing apps' category/port snapshots still resolve to a string in API responses (check mobile app didn't break). Admin can edit AR name and see it reflect in client UI. |
| 7 | Tracking, FillApplication, Dashboards in AR; numbers/dates render via `Intl`. |
| 8 | Zero missing keys (CI). Native speaker review. Lighthouse a11y still ≥ 95. |

---

## 18. Performance considerations

- **Bundle**: i18next + react-i18next ≈ 40 KB minified. Locales are lazy-loaded per namespace, so initial JS only ships `common` (≈ 5 KB JSON).
- **Cairo font**: ~85 KB woff2 per weight; load only on AR; `font-display: swap` to avoid FOIT.
- **Re-renders**: i18next subscribes components via context; changing language re-renders the tree once. Negligible at our scale.
- **No SSR penalty** — CRA is client-rendered.
- **Cache `Accept-Language` header** at the CDN if we ever add one (varies by header). Not relevant on Vercel as it stands.

---

## 19. SEO considerations for Arabic

- Single-URL strategy now (no `/ar/...` routes). Search engines see one URL; fine for an auth-walled product.
- For public pages, emit correct `<html lang>` dynamically (done by the provider) and `<meta name="description">` localized via `react-helmet` (or `document.title` setter inside each page).
- **When SEO becomes a priority**, add:
  - `/ar/...` and `/en/...` URL prefixes (router refactor, ~1 day).
  - `<link rel="alternate" hreflang="ar" href="https://.../ar/...">` and matching `en`/`x-default`.
  - Pre-render via `react-snap` for crawler-friendly HTML.
- **Sitemap**: list both languages once URL-prefixed.
- Use real AR copy — don't ship machine-translated text long-term; it ranks poorly and hurts trust.

---

## 20. Final migration strategy (zero-downtime, no breakage)

At every commit, the running app works in EN exactly as today, and AR support grows monotonically.

1. **Ship Phase 1 silently** — provider mounted, no UI change, switcher hidden. Verify in staging.
2. **Roll out RTL CSS migration** — purely cosmetic refactor; EN unchanged because logical props are symmetric. Verify with screenshots before/after.
3. **Make Cairo + switcher visible** only after public-pages translation work (Phase 4) is ≥ 80% done — so the first user to click "ع" lands on real Arabic content, not English fallbacks.
4. **Backend bilingual migration runs via `setup_mongo.js`** — idempotent, AR initially mirrors EN. API responses stay byte-identical (still plain strings). Mobile app unaffected.
5. **Admin fills in real AR strings** through the existing category/port edit UI (extended in Phase 6). No deploy needed per content edit.
6. **Translated pages are independently mergeable** — partial AR coverage is acceptable; missing keys fall back to EN.
7. **No big-bang cutover.** No "i18n branch" that lives for weeks. Every PR is small (one page or one concern) and ships independently.
8. **Rollback plan**: removing the switcher button reverts behavior to EN for users. The provider can stay mounted with no harm.

---

# Pre-Phase 1 Inventory

> Generated from a full scan of the repo before any code is written.

## A. Hardcoded frontend strings

**Scope**: 25 files contain user-facing literals (JSX text, `placeholder=`, `aria-label=`, `title=`, `alert()`, `confirm()`). Raw grep returned **351 hits**; real translation key count will be ≈600–800 once heading copy, button labels, and helper text the grep underestimates are extracted.

| File | ~Hits | Namespace | Priority |
|---|---|---|---|
| `pages/auth/CompanyRegister.jsx` | 54 | `auth` | P2 |
| `pages/admin/AdminManagement.jsx` | 43 | `admin` | P4 |
| `pages/client/FillApplication.jsx` | 34 | `client` | P3 |
| `components/PublicLayout.jsx` | 29 | `common` | **P1** (nav/footer everywhere) |
| `pages/company/CompanyProfileEdit.jsx` | 23 | `company` | P3 |
| `pages/client/PaymentPage.jsx` | 21 | `client` | P3 |
| `pages/auth/UserRegister.jsx` | 18 | `auth` | P2 |
| `pages/client/Tracking.jsx` | 18 | `client` | P3 |
| `pages/client/RecommendationWizard.jsx` | 17 | `client` | P3 |
| `pages/company/CompanyDashboard.jsx` | 13 | `company` | P3 |
| `pages/auth/UserLogin.jsx` | 12 | `auth` | P2 |
| `pages/auth/CompanyLogin.jsx` | 12 | `auth` | P2 |
| `pages/public/LandingPage.jsx` | 9 (undercounted) | `landing` | P1 |
| `pages/public/ContactUs.jsx` | 9 | `landing` | P1 |
| `pages/client/CompanyDetails.jsx` | 7 | `client` | P3 |
| `pages/admin/AdminCommissions.jsx` | 6 | `admin` | P4 |
| `pages/admin/AdminDashboard.jsx` | 5 | `admin` | P4 |
| `pages/client/UserProfileEdit.jsx` | 5 | `client` | P3 |
| `pages/public/AboutUs.jsx` | 4 (undercounted) | `landing` | P1 |
| `pages/admin/AdminProfileEdit.jsx` | 4 | `admin` | P4 |
| `components/CreditCard.jsx` | 3 | `common` | P3 |
| `pages/public/BrowseCompanies.jsx` | 2 (undercounted) | `landing` | P1 |
| `pages/public/TermsOfService.jsx` | huge legal copy | `legal` | P1 |
| `pages/public/PrivacyPolicy.jsx` | huge legal copy | `legal` | P1 |
| `components/InteractiveMap.jsx`, `ConfirmModal.jsx` | 1–2 each | `common` | P1 |

**Notes:**
- Legal pages (`PrivacyPolicy`, `TermsOfService`) — store prose as a JSON array of paragraphs per language rather than per-sentence keys.
- `AboutUs` and `LandingPage` undercount heavily because copy lives inside `<Reveal>` and sub-components; expect ~50 keys each.
- `alert()` / `confirm()` calls and validation error strings appear scattered; route them through the `errors` namespace.

## B. Backend APIs affected

These endpoints surface `Category.Type` or `Port.PortName` (directly or via snapshots). Each must run its payload through `localize(req.lang)` before responding.

**Category-touching endpoints**
- `GET /category/` — list categories
- `GET /category/search`
- `GET /category/with-usage` (admin)
- `POST/PUT /category/` — admin CRUD (accept `{ Name: { en, ar } }`)
- `GET /companycategory/`, `/search`, plus `POST/PUT/DELETE` (Company embedded categories)
- `GET /review/by-client`, `/company`, `/averages`, `/` — embed `category.Type`
- `GET /application/` (and `client-list`, `company-list`, `search`) — embed `category`
- `GET /admin/stats`, `/admin/export-report` — aggregate by category
- `POST /company/recommend` — surfaces categories
- `GET /stats/landing` — landing-page metrics

**Port-touching endpoints**
- `GET /port/`, `/search`, `/with-usage`, `POST/PUT /port/`
- `GET /companyport/`, `/search`, `POST/DELETE /companyport/`
- `GET /application/...` — embed `port` snapshot
- `GET /company/` (profile) — embeds `ports[]`

**New endpoints / changes needed**
- Language middleware mounted in `bootstrap()` reads `Accept-Language` or `?lang=ar`, sets `req.lang`.
- Snapshot fan-out `updateMany()` in `category_service.updateCategory`, `port_service.updatePort` to propagate `{en, ar}` shape on snapshot updates.

**Not affected** (no localizable content): auth (`/user/login`, `/user/register`, `/company/login`, `/company/register`), `/document/*`, `/payment/*`, `/companypayment/*`, `/supportticket/*` (free-form user input), `/user/online`.

## C. Schemas affected

Five model files plus their snapshot subdocs.

| File | Field today | Field after | Notes |
|---|---|---|---|
| `Database/mongo/category.mongo.js` | `Type: String` | `Name: { en: String, ar: String }` | Renames field + reshape; migration in `setup_mongo.js` |
| `Database/mongo/port.mongo.js` | `PortName: String` | `PortName: { en: String, ar: String }` | Keep field name to minimize churn |
| `Database/mongo/application.mongo.js` | `CategorySnapSchema.Type: String`, `PortSnapSchema.PortName: String` | both become `{ en, ar }` | Snapshot back-fill required |
| `Database/mongo/review.mongo.js` | inline `category.Type: String` | `category.Name: { en, ar }` | Rename + reshape |
| `Database/mongo/company.mongo.js` | `CompanyPortSubSchema.PortName: String`, `CompanyCategorySubSchema.Type: String` | both become `{ en, ar }` | Embedded join data |

**Unchanged**: `user.mongo.js`, `support_ticket.mongo.js`, `company_payment.mongo.js`, `counters.js`.

A new shared `LocalizedStringSchema` should live in `Database/mongo/_shared.js` so all five files import the same shape.

## D. CSS files with physical (non-logical) properties

**4 stylesheets, 14 offending lines** (translateX in keyframes excluded — animation deltas, not layout):

| File | Lines | Property |
|---|---|---|
| `styles/theme.css` | 272, 273 | `left: 0; right: 0;` → `inset-inline: 0;` |
| `styles/theme.css` | 291 | `margin-left: 16px` → `margin-inline-start: 16px` |
| `styles/theme.css` | 452 | `.input-with-icon .input { padding-left: 38px; }` → `padding-inline-start` |
| `styles/theme.css` | 455 | `left: 12px` (icon position) → `inset-inline-start` |
| `styles/theme.css` | 738 | `inset: 0` — fine, symmetric |
| `styles/theme.css` | 918, 919 | `.timeline-step::before { left: 0; } ::after { right: 0; }` → `inset-inline-start/end` |
| `pages/auth/Auth.module.css` | 130 | `padding-right: 56px` → `padding-inline-end` |
| `pages/auth/Auth.module.css` | 135 | `right: 8px` → `inset-inline-end` |
| `pages/auth/Auth.module.css` | 214 | `inset: 0` — fine |
| `components/ContainerSpinner.css` | 97–104 | `transform: translateX(...)` — keyframes; leave or mirror under `[dir="rtl"]` |

**No** physical-property usage in `index.css` beyond global resets.

**Inline-JSX style objects** (`style={{ left: 0 }}`) also detected in:
- `components/InteractiveMap.jsx`, `LandingPage.jsx`, `AdminProfileEdit.jsx`, `AdminManagement.jsx`, `ConfirmModal.jsx` — each needs manual review (mix of positions on map markers, fixed overlays, etc.; some need logical conversion, some — like map pin coordinates — must stay physical).

## E. Snapshot collections affected

Snapshots embedding `Type` (Category) or `PortName` (Port) — need migration + ongoing fan-out:

| Collection | Subdoc | Fields to reshape |
|---|---|---|
| `applications` | `category` | `Type` → `Name: {en, ar}` |
| `applications` | `port` | `PortName` → `{en, ar}` |
| `reviews` | `category` | `Type` → `Name: {en, ar}` |
| `companies` | `categories[]` (CompanyCategorySubSchema) | `Type` → `{en, ar}` |
| `companies` | `ports[]` (CompanyPortSubSchema) | `PortName` → `{en, ar}` |

**Not affected**: `users`, `supporttickets`, `companypayments`, `documents` (embedded under Application — only carry `DocType` enum, monolingual).

**Fan-out paths to extend**:
- `category_service.updateCategory` → `applications.category`, `reviews.category`, `companies.categories[].Type` (positional `$`).
- `port_service.updatePort` → `applications.port`, `companies.ports[].PortName` (positional `$`).

---

# Migration checklist (gates before any code change)

## Pre-flight
- [ ] **Backup MongoDB Atlas** (snapshot or `mongodump`) before running the new `setup_mongo.js` migration.
- [ ] **Confirm Arabic copy source** for: legal pages, landing, About, Contact, all UI strings.
- [ ] **Confirm category & port AR names**: seed AR = EN initially, fill via admin UI, or provide a CSV?
- [ ] **Confirm digit policy**: Latin (123) vs. Arabic-Indic (١٢٣) — recommendation Latin.
- [ ] **Confirm switcher visibility**: only for v1 web, or also expose to mobile in this pass?
- [ ] **Confirm language switcher placement**: header always, or footer + settings menu only?

## Phase 1 — infra (no UI change)
- [ ] Add deps to `frontend/package.json`: `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `@fontsource/cairo`.
- [ ] Create `frontend/src/i18n/index.js` with `LanguageProvider` + `useLanguage()` hook.
- [ ] Create empty `locales/{en,ar}/common.json` files (EN has placeholder current strings, AR mirrors EN).
- [ ] Mount provider in `main.jsx`; verify app renders identically.
- [ ] Centralize axios in `frontend/src/api/client.js` and inject `Accept-Language` header.
- [ ] Wire `?lang=ar` URL flag for manual QA (hidden switcher gate).

## Phase 2 — RTL plumbing
- [ ] Refactor `styles/theme.css` lines 272, 273, 291, 452, 455, 918, 919 to logical properties.
- [ ] Refactor `Auth.module.css` lines 130, 135 to logical properties.
- [ ] Audit inline `style={{ left|right }}` in 5 components — convert where layout, leave where coordinate-based (map pins).
- [ ] Add `[dir="rtl"] .icon-flip { transform: scaleX(-1); }` utility; apply class to directional icons only.
- [ ] Visual diff EN before/after — must be identical.

## Phase 3 — language switcher + Cairo
- [ ] Add Cairo font, scoped to `html[lang="ar"]`.
- [ ] Add `<LanguageSwitcher>` to `PublicLayout`.
- [ ] Verify persistence in localStorage (`app:lang`), reload, second-tab consistency.

## Phase 4 — translate public pages
- [ ] `PublicLayout` (highest payoff — every public page).
- [ ] `LandingPage`, `AboutUs`, `ContactUs`, `BrowseCompanies`.
- [ ] `PrivacyPolicy`, `TermsOfService` (paragraph arrays).

## Phase 5 — translate auth pages
- [ ] `UserLogin`, `UserRegister`, `CompanyLogin`, `CompanyRegister`.
- [ ] Introduce backend error-code constants; map to `errors` namespace on frontend.

## Phase 6 — backend bilingual migration
- [ ] Create `Database/mongo/_shared.js` with `LocalizedStringSchema`.
- [ ] Update `category.mongo.js`, `port.mongo.js`, `application.mongo.js`, `review.mongo.js`, `company.mongo.js`.
- [ ] Extend `setup_mongo.js`: rewrite string `Type`/`PortName` → `{en, ar}` across collections + snapshots; idempotent.
- [ ] Add `middleware/language.js` and `utils/localize.js`; mount middleware in `bootstrap()`.
- [ ] Update services to call `localize(payload, req.lang)` on responses.
- [ ] Extend fan-out `updateMany()` in `category_service.updateCategory`, `port_service.updatePort`.
- [ ] Extend admin UI in `AdminManagement.jsx` with AR input fields for Category & Port.
- [ ] Verify mobile app (`X-Client-Platform: mobile`) still gets plain-string responses.

## Phase 7 — translate authed pages
- [ ] Client: `CompanyDetails`, `FillApplication`, `PaymentPage`, `Tracking`, `RecommendationWizard`, `UserProfileEdit`.
- [ ] Company: `CompanyDashboard`, `CompanyProfileEdit`.
- [ ] Admin: `AdminDashboard`, `AdminManagement`, `AdminProfileEdit`, `AdminCommissions`.

## Phase 8 — polish & QA
- [ ] Audit & migrate all `alert()` / `confirm()` calls.
- [ ] Add CI script `i18n-diff.js` to flag missing keys between `en` and `ar`.
- [ ] Native-speaker QA pass on AR.
- [ ] Lighthouse a11y check ≥ 95.
- [ ] Mobile app smoke test against new API.

## Per-phase gate
- [ ] After each phase: deploy to staging, manual sanity in **both** EN and AR, confirm no console errors, confirm mobile app still authenticates and lists applications.

---

# Open questions before coding starts

1. **Source of Arabic translations** — native-speaker translator available, or machine-translate as placeholder and flag for review?
2. **Category/Port AR names** — canonical AR list available, or seed AR = EN initially and fill via admin UI?
3. **Digits in AR mode** — Latin (`123`) or Arabic-Indic (`١٢٣`)? Recommendation: Latin.
4. **Switcher placement** — top-right of every page, or only in the public header + a settings option for authed users?
5. **Should the mobile app also get i18n in this pass**, or is web-only acceptable for v1?
6. **Backup window** — when can we take the MongoDB Atlas snapshot before Phase 6?

Once these are answered and the plan is approved, implementation starts with **Phase 1** — infra only, zero visible change.
