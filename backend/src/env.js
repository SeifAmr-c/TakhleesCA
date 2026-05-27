import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/* Load backend/.env by an ABSOLUTE path (computed from this file's
   location) rather than relative to process.cwd(). Importing
   'dotenv/config' resolves .env against the current working directory,
   so launching the server from anywhere other than backend/ (e.g.
   `node backend/src/index.js` from the repo root) silently misses the
   file and the app falls back to whatever Mongo_url is exported in the
   shell — which is how local runs were leaking writes to production.

   `override: true` makes the .env file authoritative over any stale
   shell variables, so Mongo_url_local always wins during local dev. In
   production there is typically no .env file (config comes from the
   hosting platform); dotenv then no-ops and the platform's process.env
   is left untouched. Import this module FIRST in every entry point. */
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env'), override: true });
