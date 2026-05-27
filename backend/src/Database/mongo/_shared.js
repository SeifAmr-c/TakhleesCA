import mongoose from 'mongoose';

/* Reusable bilingual string subdoc. Curated reference data (Category
   names, Port names) and their denormalized snapshots store both
   languages; the API flattens this back to a plain string per request
   via utils/localize.js, so clients (web + mobile) still receive a
   single string under the same field name they read today.

   `ar` falls back to `en` at read time, so a missing/empty Arabic value
   never blanks the UI — both are required on write to keep the catalog
   complete, but localize() tolerates an empty ar defensively. */
export const LocalizedStringSchema = new mongoose.Schema(
    {
        en: { type: String, required: true, trim: true },
        ar: { type: String, required: true, trim: true },
    },
    { _id: false }
);

export default LocalizedStringSchema;
