import mongoose from 'mongoose';

const PortSchema = new mongoose.Schema(
    {
        PortID:   { type: Number, index: true, unique: true },
        PortName: { type: String, required: true, trim: true },
        PortType: { type: String, required: true, enum: ['Air', 'Sea'] },
        EstDate:  { type: Date,   required: true },
    },
    { timestamps: true }
);

export default mongoose.model('Port', PortSchema);
