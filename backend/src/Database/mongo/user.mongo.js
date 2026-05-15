import mongoose from 'mongoose';

/* Single-collection inheritance for the User domain:
   Client and Admin variants are stored as embedded subdocs on the
   parent User doc. Type determines which subdoc is populated. */
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
        /* Public integer ID — what the React frontend uses in URLs and
           what every other collection stores as a reference. Minted by
           the counters helper on insert. */
        UserID: { type: Number, index: true, unique: true },

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

        client: { type: ClientSubSchema, default: null },
        admin:  { type: AdminSubSchema,  default: null },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc, ret) {
                delete ret.Password;
                return ret;
            },
        },
    }
);

UserSchema.index({ 'client.PhoneNumber': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'client.NationalID': 1 },  { unique: true, sparse: true });

export default mongoose.model('User', UserSchema);
