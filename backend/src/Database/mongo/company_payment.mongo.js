import mongoose from 'mongoose';

/* CompanyPayment is the commission ledger: one row per client payment that
   triggered a company-side payout. Kept as its own collection rather than
   embedded under Company because rows grow unbounded over the company's
   lifetime and admin reporting queries scan across companies by date range
   without loading the Company doc itself. */
const CompanyPaymentSchema = new mongoose.Schema(
    {
        mysqlCompanyPaymentId: { type: Number, index: true, unique: true, sparse: true },

        PaymentDate: { type: Date,   required: true, default: Date.now, index: true },
        Amount:      { type: Number, required: true, min: 0 },

        /* CompanyID is nullable in MySQL (a payment may exist before being
           attributed), so mirror that here. */
        mysqlCompanyId: { type: Number, default: null, index: true },
        /* The source client payment — required, since the row only exists
           as a consequence of a Payment. */
        mysqlPaymentId: { type: Number, required: true, index: true },

        /* Denormalized snapshot so payout history can render the company
           name without an extra Company lookup per row. */
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

/* Backs admin date-range reports per company. */
CompanyPaymentSchema.index({ mysqlCompanyId: 1, PaymentDate: -1 });

export default mongoose.model('CompanyPayment', CompanyPaymentSchema);
