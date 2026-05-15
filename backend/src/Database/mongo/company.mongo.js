import mongoose from 'mongoose';

/* Embedded subdocs — _id:false because they aren't independent entities,
   they are config rows that belong to exactly one Company. */
const CompanyPortSubSchema = new mongoose.Schema(
    {
        mysqlPortId: { type: Number, required: true },
        /* Denormalized snapshots so the mobile app can render the company
           profile without an extra Port lookup. Refresh via the
           Port update path or a periodic backfill job. */
        PortName: { type: String },
        PortType: { type: String, enum: ['Air', 'Sea'] },
    },
    { _id: false }
);

const CompanyCategorySubSchema = new mongoose.Schema(
    {
        mysqlCategoryId: { type: Number, required: true },
        Type:  { type: String, enum: ['Electronics', 'Cars', 'Clothes', 'Other'] },
        Price: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const CompanySchema = new mongoose.Schema(
    {
        mysqlCompanyId: { type: Number, index: true, unique: true, sparse: true },

        Name:             { type: String, required: true, trim: true },
        ContactEmail:     { type: String, required: true, unique: true, lowercase: true, trim: true },
        FoundingDate:     { type: Date,   required: true },
        Password:         { type: String, required: true },
        Comm:             { type: Number, required: true, min: 0, max: 99.99 },
        RegistrationDate: { type: Date,   required: true },
        TaxNumber:        { type: Number, required: true, unique: true, sparse: true },
        VerficationStatus:{ type: String, required: true, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },

        ComReg:      { type: String, default: null },
        Governorate: { type: String, default: null },
        Address:     { type: String, default: null },
        About:       { type: String, default: null },
        LogoUrl:     { type: String, default: null },
        PdfExportCount: { type: Number, default: 0 },

        /* Folded-in CompanyPort and CompanyCategory join tables. */
        ports:      { type: [CompanyPortSubSchema],     default: [] },
        categories: { type: [CompanyCategorySubSchema], default: [] },
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

export default mongoose.model('Company', CompanySchema);
