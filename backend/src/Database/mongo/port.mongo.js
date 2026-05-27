import mongoose from 'mongoose';
import { LocalizedStringSchema } from './_shared.js';

const PortSchema = new mongoose.Schema(
    {
        PortID:   { type: Number, index: true, unique: true },
        /* Bilingual name; localize() flattens to a string per request. */
        PortName: { type: LocalizedStringSchema, required: true },
        PortType: { type: String, required: true, enum: ['Air', 'Sea'] },
        EstDate:  { type: Date,   required: true },
    },
    { timestamps: true }
);

export default mongoose.model('Port', PortSchema);
