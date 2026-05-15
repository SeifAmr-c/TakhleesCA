import Application from '../../Database/mongo/application.mongo.js';

/* Shape one Mongo Application doc into the response format the mobile
   app already expects (same field names the MySQL list endpoints returned).
   This is the only place we adapt — the mobile screens don't need to change. */
const shapeRow = (doc, { includeToken }) => {
    const Amount = (doc.payments ?? []).reduce((s, p) => s + Number(p.Amount || 0), 0);
    const TrackingNumber = doc.TrackingNumber;
    const Token = doc.CompletionToken;
    const QrPayload = Token ? `${TrackingNumber}:${Token}` : null;

    const base = {
        ApplicationID:   doc.mysqlApplicationId,
        TrackingNumber,
        Status:          doc.Status,
        PaymentType:     doc.PaymentType,
        SubmissionDate:  doc.SubmissionDate,
        CompletionDate:  doc.CompletionDate,
        DeliveryAddress: doc.DeliveryAddress,
        ACID:            doc.ACID,
        CompanyID:       doc.mysqlCompanyId,
        ClientID:        doc.mysqlClientId,
        CategoryID:      doc.mysqlCategoryId,
        PortID:          doc.mysqlPortId,
        ClientName:      doc.client ? `${doc.client.FirstName ?? ''} ${doc.client.LastName ?? ''}`.trim() : null,
        CategoryName:    doc.category?.Type ?? null,
        PortName:        doc.port?.PortName ?? null,
        PortType:        doc.port?.PortType ?? null,
        CompanyName:     doc.company?.Name ?? null,
        CompanyLogoUrl:  doc.company?.LogoUrl ?? null,
        Amount,
    };

    /* Mirror the MySQL listClientApplications behaviour: clients see their
       own CompletionToken so the mobile app can render the QR; everyone
       else (companies) gets neither the raw token nor QrPayload. */
    if (includeToken) {
        base.CompletionToken = Token;
        base.QrPayload = QrPayload;
    }
    return base;
};

/* GET /mobile/application/company-list  (requires company session)
   Mongo-backed equivalent of /application/company-list. Same response
   shape and the same Status filter (Pending + Completed only). */
export const listCompanyApplications = async (req, res, next) => {
    try {
        const CompanyID = req.session?.companyId;
        if (!CompanyID) {
            return res.status(401).json({ ok: false, message: 'Company sign-in required.' });
        }
        const docs = await Application
            .find({
                mysqlCompanyId: Number(CompanyID),
                Status: { $in: ['Pending', 'Completed'] },
            })
            .sort({ _id: -1 })
            .lean();
        return res.json(docs.map((d) => shapeRow(d, { includeToken: false })));
    } catch (err) {
        return next(err);
    }
};

/* GET /mobile/application/client-list  (requires user session)
   Mongo-backed equivalent of /application/client-list. */
export const listClientApplications = async (req, res, next) => {
    try {
        const ClientID = req.session?.userId;
        if (!ClientID) {
            return res.status(401).json({ ok: false, message: 'Authentication required.' });
        }
        const docs = await Application
            .find({ mysqlClientId: Number(ClientID) })
            .sort({ _id: -1 })
            .lean();
        return res.json(docs.map((d) => shapeRow(d, { includeToken: true })));
    } catch (err) {
        return next(err);
    }
};
