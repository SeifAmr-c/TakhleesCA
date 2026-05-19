import mongoose from 'mongoose';

/* Reviews live in their own collection because they are aggregated
   independently of their parent application — per-company rating
   displays and per-category browse pages scan reviews directly. */
const ReviewSchema = new mongoose.Schema(
    {
        ReviewID: { type: Number, index: true, unique: true },

        Review: { type: String, default: null, maxlength: 255 },
        Rating: { type: Number, required: true, min: 1, max: 5 },

        ApplicationID: { type: Number, required: true, index: true },
        CategoryID:    { type: Number, required: true, index: true },
        CompanyID:     { type: Number, default: null, index: true },
        ClientID:      { type: Number, default: null, index: true },

        category: {
            type: new mongoose.Schema(
                /* Open string to match the admin-managed Category.Type. */
                { Type: { type: String } },
                { _id: false }
            ),
            default: null,
        },
        client: {
            type: new mongoose.Schema(
                { FirstName: String, LastName: String },
                { _id: false }
            ),
            default: null,
        },
    },
    { timestamps: true }
);

ReviewSchema.index({ CompanyID: 1, _id: -1 });

export default mongoose.model('Review', ReviewSchema);
