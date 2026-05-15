import mongoose from 'mongoose';

/* Subdocument schemas for Client and Admin variants.
   _id: false because they are embedded, not their own collection. */
const ClientSubSchema = new mongoose.Schema(
    {
        PhoneNumber: { type: String, required: true },
        NationalID:  { type: String, required: true },
        Address:     { type: String, required: true },
    },
    { _id: false }
);

const AdminSubSchema = new mongoose.Schema(
    {
        LastLogin: { type: Date, default: Date.now },
    },
    { _id: false }
);

const UserSchema = new mongoose.Schema(
    {
        /* Bridge field: store the MySQL UserID during dual-write so we can
           reconcile rows across both databases. Drop this column once the
           cutover is complete. */
        mysqlUserId: { type: Number, index: true, unique: true, sparse: true },

        FirstName: { type: String, required: true, trim: true, minlength: 2 },
        LastName:  { type: String, required: true, trim: true, minlength: 2 },
        Email:     {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        Password:  { type: String, required: true },
        Type:      { type: String, required: true, enum: ['C', 'A'] },

        /* Embedded variants — only one is populated at a time, decided by Type. */
        client: { type: ClientSubSchema, default: null },
        admin:  { type: AdminSubSchema,  default: null },
    },
    {
        /* timestamps adds createdAt + updatedAt automatically — equivalent to
           a MySQL DEFAULT CURRENT_TIMESTAMP column you'd otherwise add by hand. */
        timestamps: true,
        /* Strip Password from JSON responses by default so we don't have to
           remember to sanitize at every call site. */
        toJSON: {
            transform(_doc, ret) {
                delete ret.Password;
                return ret;
            },
        },
    }
);

/* Compound uniqueness for client identifiers — only enforced when the field
   is present (sparse) so admin docs without a client subdoc don't collide. */
UserSchema.index({ 'client.PhoneNumber': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'client.NationalID': 1 },  { unique: true, sparse: true });

/* Mongoose model name → collection name 'users' (auto-pluralized lowercase).
   Pass an explicit third arg if you want to override that. */
const User = mongoose.model('User', UserSchema);

export default User;
