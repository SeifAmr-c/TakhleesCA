import mongoose from 'mongoose';

const PortSchema = new mongoose.Schema(
    {
        mysqlPortId: { type: Number, index: true, unique: true, sparse: true },
        PortName:    { type: String, required: true, trim: true },
        PortType:    { type: String, required: true, enum: ['Air', 'Sea'] },
        EstDate:     { type: Date,   required: true },
    },
    { timestamps: true }
);

export default mongoose.model('Port', PortSchema);
