import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
    {
        mysqlCategoryId: { type: Number, index: true, unique: true, sparse: true },
        Type:            { type: String, required: true, enum: ['Electronics', 'Cars', 'Clothes', 'Other'] },
    },
    { timestamps: true }
);

export default mongoose.model('Category', CategorySchema);
