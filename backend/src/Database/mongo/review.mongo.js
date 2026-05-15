import mongoose from 'mongoose';

/* Review is its own collection rather than an embedded subdoc on Application:
   reviews are queried independently of their parent Application — aggregated
   per Company for rating displays and per Category for browse pages — so
   embedding would force us to fan-scan every Application to build those
   listings. */
const ReviewSchema = new mongoose.Schema(
    {
        mysqlReviewId: { type: Number, index: true, unique: true, sparse: true },

        Review: { type: String, default: null, maxlength: 255 },
        Rating: { type: Number, required: true, min: 1, max: 5 },

        /* Bridge IDs. We also carry CompanyID/ClientID even though MySQL only
           stores ApplicationID + CategoryID — the mobile app browses reviews
           by company, and resolving Application → Company on every read is
           wasteful when we can denormalize at write time. */
        mysqlApplicationId: { type: Number, required: true, index: true },
        mysqlCategoryId:    { type: Number, required: true, index: true },
        mysqlCompanyId:     { type: Number, default: null, index: true },
        mysqlClientId:      { type: Number, default: null, index: true },

        /* Denormalized snapshots — same fan-out refresh story as elsewhere. */
        category: {
            type: new mongoose.Schema(
                { Type: { type: String, enum: ['Electronics', 'Cars', 'Clothes', 'Other'] } },
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

/* Compound index for "list newest reviews of a company". */
ReviewSchema.index({ mysqlCompanyId: 1, _id: -1 });

export default mongoose.model('Review', ReviewSchema);
