import mongoose from 'mongoose';
import { LocalizedStringSchema } from './_shared.js';

const CategorySchema = new mongoose.Schema(
    {
        CategoryID: { type: Number, index: true, unique: true },
        /* Admin-managed bilingual name. Field stays named `Type` so the
           flattened API response key is unchanged for existing clients;
           localize() collapses { en, ar } to the active language. */
        Type:       { type: LocalizedStringSchema, required: true },
    },
    { timestamps: true }
);

export default mongoose.model('Category', CategorySchema);
