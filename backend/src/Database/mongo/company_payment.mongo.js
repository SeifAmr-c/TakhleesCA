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
