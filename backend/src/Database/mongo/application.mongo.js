import mongoose from 'mongoose';

/* Documents and Payments are always read with their parent Application
   and never queried independently, so they live as embedded arrays. */
const DocumentSubSchema = new mongoose.Schema(
    {
        DocumentID: { type: Number, required: true, index: true },
        DocType: {
            type: String,
            required: true,
            enum: ['National ID / Passport', 'Proof Of Payment', 'Delegation', 'Shipping Document'],
        },
        UploadDate: { type: Date, default: Date.now },
        VerficationStatus: {
            type: String,
            required: true,
            enum: ['Pending', 'Accepted', 'Rejected'],
            default: 'Pending',
        },
        Path: { type: String, required: true },
    },
    { _id: false }
);

const PaymentSubSchema = new mongoose.Schema(
    {
        PaymentID: { type: Number, required: true, index: true },
        PaymentDate: { type: Date, default: Date.now },
        Amount: { type: Number, required: true, min: 0 },
        PaymentGateway: { type: String, required: true, enum: ['Credit Card', 'Bank Transfer'] },
    },
    { _id: false }
);

/* Denormalized snapshots so the list view renders without per-row lookups.
   Refreshed via fan-out updateMany when the referenced parent doc changes. */
const ClientSnapSchema = new mongoose.Schema(
    { FirstName: String, LastName: String },
    { _id: false }
);

const CompanySnapSchema = new mongoose.Schema(
    { Name: String, LogoUrl: String },
    { _id: false }
);

const CategorySnapSchema = new mongoose.Schema(
    { Type: String },
    { _id: false }
);

const PortSnapSchema = new mongoose.Schema(
    { PortName: String, PortType: { type: String, enum: ['Air', 'Sea'] } },
    { _id: false }
);

const ApplicationSchema = new mongoose.Schema(
    {
        ApplicationID: { type: Number, index: true, unique: true },

        PaymentType: { type: String, required: true, enum: ['FULL', 'PARTIAL'] },
        Status: {
            type: String,
            required: true,
            enum: ['Pending', 'In Progress', 'Completed', 'Accepted', 'Rejected'],
            index: true,
        },
        SubmissionDate: { type: Date, required: true, default: Date.now },
        CompletionDate: { type: Date, default: null },
        TrackingNumber: { type: String, required: true, unique: true },
        DeliveryAddress: { type: String, required: true },
        ACID: { type: String, required: true },
        CompletionToken: { type: String, default: null, index: true, sparse: true },

        CompanyID:  { type: Number, default: null, index: true },
        ClientID:   { type: Number, default: null, index: true },
        CategoryID: { type: Number, default: null },
        PortID:     { type: Number, default: null },

        client:   { type: ClientSnapSchema,   default: null },
        company:  { type: CompanySnapSchema,  default: null },
        category: { type: CategorySnapSchema, default: null },
        port:     { type: PortSnapSchema,     default: null },

        documents: { type: [DocumentSubSchema], default: [] },
        payments:  { type: [PaymentSubSchema],  default: [] },
    },
    { timestamps: true }
);

ApplicationSchema.index({ CompanyID: 1, Status: 1, _id: -1 });
ApplicationSchema.index({ ClientID: 1, _id: -1 });

export default mongoose.model('Application', ApplicationSchema);
