import mongoose from 'mongoose';

/* SupportTicket stays in its own collection — tickets are listed independently
   of the User document (admin queue views, client history pages) and grow
   unbounded per user, so embedding under User would bloat hot reads. */
const SupportTicketSchema = new mongoose.Schema(
    {
        mysqlTicketId: { type: Number, index: true, unique: true, sparse: true },

        Issue:    { type: String, required: true, trim: true, maxlength: 255 },
        Resolved: { type: Boolean, required: true, default: false, index: true },

        /* Bridge IDs back to the unified User collection. AdminID is optional
           because an unassigned ticket has no admin yet. */
        mysqlAdminId:  { type: Number, default: null, index: true },
        mysqlClientId: { type: Number, required: true, index: true },

        /* Denormalized snapshots so the admin queue can render names without
           an extra User lookup per row. Refreshed when User.FirstName/LastName
           change via fan-out updateMany. */
        admin:  {
            type: new mongoose.Schema(
                { FirstName: String, LastName: String },
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

/* Backs the admin queue: "show me open tickets, newest first". */
SupportTicketSchema.index({ Resolved: 1, _id: -1 });

export default mongoose.model('SupportTicket', SupportTicketSchema);
