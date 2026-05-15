import mongoose from 'mongoose';

/* Standalone collection — tickets are queried independently of the User
   document (admin queue views) and grow unbounded per user. */
const SupportTicketSchema = new mongoose.Schema(
    {
        TicketID: { type: Number, index: true, unique: true },

        Issue:    { type: String, required: true, trim: true, maxlength: 255 },
        Resolved: { type: Boolean, required: true, default: false, index: true },

        AdminID:  { type: Number, default: null, index: true },
        ClientID: { type: Number, required: true, index: true },

        admin:  {
            type: new mongoose.Schema(
                { FirstName: String, LastName: String },
                { _id: false }
            ),
            default: null,
        },
        client: {
            type: new mongoose.Schema(
                { FirstName: String, LastName: String, Email: String },
                { _id: false }
            ),
            default: null,
        },
    },
    { timestamps: true }
);

SupportTicketSchema.index({ Resolved: 1, _id: -1 });

export default mongoose.model('SupportTicket', SupportTicketSchema);
