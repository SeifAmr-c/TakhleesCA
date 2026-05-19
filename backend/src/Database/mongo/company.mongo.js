import mongoose from 'mongoose';

/* Bounded join data — every company has a small, fixed set of ports it
   serves and categories it prices. Embedding avoids a per-list-query
   join and keeps the company doc self-sufficient for profile renders. */
const CompanyPortSubSchema = new mongoose.Schema(
    {
        PortID:   { type: Number, required: true },
        PortName: { type: String },
        PortType: { type: String, enum: ['Air', 'Sea'] },
    },
    { _id: false }
);

const CompanyCategorySubSchema = new mongoose.Schema(
    {
        CategoryID: { type: Number, required: true },
        /* Mirrors Category.Type — open string now that the catalog is
           admin-managed. */
        Type:       { type: String },
        Price:      { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const CompanySchema = new mongoose.Schema(
    {
        CompanyID: { type: Number, index: true, unique: true },

        Name:             { type: String, required: true, trim: true },
        ContactEmail:     { type: String, required: true, unique: true, lowercase: true, trim: true },
        FoundingDate:     { type: Date,   required: true },
        Password:         { type: String, required: true },
        Comm:             { type: Number, required: true, min: 0, max: 99.99 },
        RegistrationDate: { type: Date,   required: true },
        TaxNumber:        { type: Number, required: true, unique: true },
        VerficationStatus:{ type: String, required: true, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },

        ComReg:      { type: String, default: null },
        Governorate: { type: String, default: null },
        Address:     { type: String, default: null },
        About:       { type: String, default: null },
        LogoUrl:     { type: String, default: null },
        PdfExportCount: { type: Number, default: 0 },

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
