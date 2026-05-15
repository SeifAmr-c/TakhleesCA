import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
    {
        CategoryID: { type: Number, index: true, unique: true },
        Type:       { type: String, required: true, enum: ['Electronics', 'Cars', 'Clothes', 'Other'] },
    },
    { timestamps: true }
);

export default mongoose.model('Category', CategorySchema);
