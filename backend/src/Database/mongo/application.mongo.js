import mongoose from 'mongoose';

/* Embedded subdocs — Document and Payment are always read with their parent
   Application and are never queried independently by the mobile app, so they
   become arrays inside Application rather than separate collections. */
const DocumentSubSchema = new mongoose.Schema(
    {
        mysqlDocumentId: { type: Number, index: true },
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
        mysqlPaymentId: { type: Number, index: true },
        PaymentDate: { type: Date, default: Date.now },
        Amount: { type: Number, required: true, min: 0 },
        PaymentGateway: { type: String, required: true, enum: ['Credit Card', 'Bank Transfer'] },
    },
    { _id: false }
);

/* Denormalized snapshot subdocs — these mirror the LEFT JOINs the MySQL list
   query currently does. Names rarely change; when they do, the parent service
   (Company/Category/Port/User update) fans out an updateMany() onto every
   matching application so these stay fresh. */
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
        mysqlApplicationId: { type: Number, index: true, unique: true, sparse: true },

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

        /* Bridge IDs so the mobile read routes can look up by MySQL ID
           without needing the Mongo ObjectId. */
        mysqlCompanyId:  { type: Number, default: null, index: true },
        mysqlClientId:   { type: Number, default: null, index: true },
        mysqlCategoryId: { type: Number, default: null },
        mysqlPortId:     { type: Number, default: null },

        /* Denormalized join snapshots — kept in sync by fan-out updates. */
        client:   { type: ClientSnapSchema,   default: null },
        company:  { type: CompanySnapSchema,  default: null },
        category: { type: CategorySnapSchema, default: null },
        port:     { type: PortSnapSchema,     default: null },

        /* Embedded child arrays. */
        documents: { type: [DocumentSubSchema], default: [] },
        payments:  { type: [PaymentSubSchema],  default: [] },
    },
    { timestamps: true }
);

/* Compound index that backs the mobile list queries:
   - company-list: filter by mysqlCompanyId + Status, sort by _id desc
   - client-list:  filter by mysqlClientId, sort by _id desc */
ApplicationSchema.index({ mysqlCompanyId: 1, Status: 1, _id: -1 });
ApplicationSchema.index({ mysqlClientId: 1, _id: -1 });

export default mongoose.model('Application', ApplicationSchema);
