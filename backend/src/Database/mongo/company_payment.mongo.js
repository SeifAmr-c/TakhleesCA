import mongoose from 'mongoose';

/* CompanyPayment is the commission ledger: one row per accepted client
   payment that triggered a company-side payout. Its own collection
   because rows grow unbounded over the company's lifetime and admin
   reports scan across companies by date range. */
const CompanyPaymentSchema = new mongoose.Schema(
    {
        CompanyPaymentID: { type: Number, index: true, unique: true },

        PaymentDate: { type: Date,   required: true, default: Date.now, index: true },
        Amount:      { type: Number, required: true, min: 0 },

        /* Breakdown of Amount. Kept as separate fields (not just folded into
           Amount) so the ledger is auditable and so the monthly listing-fee
           rule can ask "did this company already pay a listing fee this
           month?" by querying ListingFee > 0. Amount === FixedFee +
           Commission + ListingFee. */
        FixedFee:   { type: Number, default: 0, min: 0 }, // 5% the client pays us at checkout
        Commission: { type: Number, default: 0, min: 0 }, // price * company.Comm%
        ListingFee: { type: Number, default: 0, min: 0 }, // flat, once per company per month

        CompanyID: { type: Number, default: null, index: true },
        PaymentID: { type: Number, required: true, index: true },

        company: {
            type: new mongoose.Schema(
                { Name: String },
                { _id: false }
            ),
            default: null,
        },
    },
    { timestamps: true }
);

CompanyPaymentSchema.index({ CompanyID: 1, PaymentDate: -1 });

export default mongoose.model('CompanyPayment', CompanyPaymentSchema);
