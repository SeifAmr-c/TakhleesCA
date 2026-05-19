import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
    {
        CategoryID: { type: Number, index: true, unique: true },
        /* Type is admin-managed: kept as an open string so new service
           categories can be added without a schema migration. */
        Type:       { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

export default mongoose.model('Category', CategorySchema);
