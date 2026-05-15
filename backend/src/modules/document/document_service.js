import { uploadToCloudinary, companyFolder } from '../../config/cloudinary.js';
import Application from '../../Database/mongo/application.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';

const DOC_TYPES = ['National ID / Passport', 'Proof Of Payment', 'Delegation', 'Shipping Document'];
const VERIFICATION_STATUSES = ['Pending', 'Accepted', 'Rejected'];

/* Documents are stored as embedded subdocs on Application. These handlers
   project the legacy row-based API onto that array. */

export const createDocumentWithFile = async (req, res, next) => {
    try {
        const DocType = String(req.body.DocType ?? '').trim();
        const ApplicationID = Number(req.body.ApplicationID);

        if (!ApplicationID) return res.status(400).json({ ok: false, message: 'ApplicationID is required.' });
        if (!DOC_TYPES.includes(DocType)) {
            return res.status(400).json({ ok: false, message: `DocType must be one of: ${DOC_TYPES.join(', ')}.` });
        }
        if (!req.file) {
            return res.status(400).json({ ok: false, message: 'File is required.' });
        }

        const app = await Application.findOne({ ApplicationID }).select({ company: 1 }).lean();
        if (!app) {
            return res.status(404).json({ ok: false, message: `Application ${ApplicationID} not found.` });
        }

        const uploaded = await uploadToCloudinary(req.file.buffer, companyFolder(app.company?.Name, 'documents'));
        const filePath = uploaded.secure_url;
        const DocumentID = await nextId('document');

        await Application.updateOne(
            { ApplicationID },
            { $push: { documents: {
                DocumentID,
                DocType,
                UploadDate: new Date(),
                VerficationStatus: 'Pending',
                Path: filePath,
            } } }
        );

        return res.status(201).json({
            ok: true,
            message: 'Document uploaded and recorded.',
            data: { DocumentID, DocType, ApplicationID, Path: filePath },
        });
    } catch (err) {
        return next(err);
    }
};

export const getDocumentsByApplication = async (req, res, next) => {
    try {
        const { ApplicationID } = req.query;
        if (!ApplicationID) {
            return res.status(400).json({ error: 'ApplicationID is required' });
        }
        const app = await Application.findOne({ ApplicationID: Number(ApplicationID) }).select({ documents: 1 }).lean();
        return res.json((app?.documents || []).map((d) => ({
            DocumentID: d.DocumentID,
            DocType: d.DocType,
            Path: d.Path,
            UploadDate: d.UploadDate,
            VerficationStatus: d.VerficationStatus,
        })));
    } catch (err) {
        return next(err);
    }
};

export const createDocument = async (req, res, next) => {
    try {
        const DocType = String(req.body.DocType ?? '').trim();
        const ApplicationID = Number(req.body.ApplicationID);
        const Path = String(req.body.Path ?? '').trim() || 'unsaved';
        const VerficationStatus = req.body.VerficationStatus ?? 'Pending';

        if (!ApplicationID) return res.status(400).json({ ok: false, message: 'ApplicationID is required.' });
        if (!DOC_TYPES.includes(DocType)) {
            return res.status(400).json({ ok: false, message: `DocType must be one of: ${DOC_TYPES.join(', ')}.` });
        }
        if (!VERIFICATION_STATUSES.includes(VerficationStatus)) {
            return res.status(400).json({ ok: false, message: `VerficationStatus must be one of: ${VERIFICATION_STATUSES.join(', ')}.` });
        }

        const exists = await Application.exists({ ApplicationID });
        if (!exists) {
            return res.status(404).json({ ok: false, message: `Application ${ApplicationID} not found.` });
        }

        const DocumentID = await nextId('document');
        await Application.updateOne(
            { ApplicationID },
            { $push: { documents: {
                DocumentID,
                DocType,
                UploadDate: new Date(),
                VerficationStatus,
                Path,
            } } }
        );

        return res.status(201).json({
            ok: true,
            message: 'Document metadata recorded.',
            data: { DocumentID, DocType, ApplicationID, Path },
        });
    } catch (err) {
        return next(err);
    }
};

export const getDocument = async (req, res, next) => {
    try {
        const { DocumentID } = req.query;
        if (DocumentID === '%' || DocumentID === undefined) {
            const apps = await Application.find({}, { documents: 1, ApplicationID: 1 }).lean();
            const rows = apps.flatMap((a) =>
                (a.documents || []).map((d) => ({ ApplicationID: a.ApplicationID, ...d }))
            );
            return res.json(rows);
        }
        const did = Number(DocumentID);
        const app = await Application.findOne({ 'documents.DocumentID': did }, { documents: 1, ApplicationID: 1 }).lean();
        if (!app) return res.json([]);
        const d = (app.documents || []).find((x) => x.DocumentID === did);
        return res.json(d ? [{ ApplicationID: app.ApplicationID, ...d }] : []);
    } catch (err) {
        return next(err);
    }
};

export const deleteDocument = async (req, res, next) => {
    try {
        const did = Number(req.query.DocumentID);
        const result = await Application.updateOne(
            { 'documents.DocumentID': did },
            { $pull: { documents: { DocumentID: did } } }
        );
        if (!result.matchedCount) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${did}] does not exist or has already been deleted.`,
            });
        }
        return res.status(200).json({ Status: "OK", Message: `Record Id [${did}] deleted Successfully` });
    } catch (err) {
        return next(err);
    }
};

export const searchDocument = async (req, res, next) => {
    try {
        const { keyword, keyvalue } = req.query;
        const allowedColumns = ['DocumentID', 'DocType', 'VerficationStatus', 'ApplicationID'];
        if (!allowedColumns.includes(keyword)) {
            return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
        }
        if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

        if (keyword === 'ApplicationID') {
            const app = await Application.findOne({ ApplicationID: Number(keyvalue) }).select({ documents: 1, ApplicationID: 1 }).lean();
            return res.json((app?.documents || []).map((d) => ({ ApplicationID: app.ApplicationID, ...d })));
        }
        const numeric = keyword === 'DocumentID';
        const value = numeric ? Number(keyvalue) : keyvalue;
        const apps = await Application.find({ [`documents.${keyword}`]: value }, { documents: 1, ApplicationID: 1 }).lean();
        const rows = [];
        for (const app of apps) {
            for (const d of (app.documents || [])) {
                if (d[keyword] === value) rows.push({ ApplicationID: app.ApplicationID, ...d });
            }
        }
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
};

export const updateDocument = async (req, res, next) => {
    try {
        const did = Number(req.query.DocumentID);
        const app = await Application.findOne({ 'documents.DocumentID': did });
        if (!app) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${did}] does not exist or has already been deleted. Update aborted.`,
            });
        }
        const existing = (app.documents || []).find((d) => d.DocumentID === did);
        if (!existing) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${did}] does not exist or has already been deleted. Update aborted.`,
            });
        }

        const DocType           = req.body.DocType           !== undefined ? req.body.DocType           : existing.DocType;
        const UploadDate        = req.body.UploadDate        !== undefined ? new Date(req.body.UploadDate) : existing.UploadDate;
        const VerficationStatus = req.body.VerficationStatus !== undefined ? req.body.VerficationStatus : existing.VerficationStatus;
        const Path              = req.body.Path              !== undefined ? req.body.Path              : existing.Path;

        await Application.updateOne(
            { 'documents.DocumentID': did },
            { $set: {
                'documents.$.DocType': DocType,
                'documents.$.UploadDate': UploadDate,
                'documents.$.VerficationStatus': VerficationStatus,
                'documents.$.Path': Path,
            } }
        );
        return res.status(200).json({ Status: "OK", Message: `Record Id [${did}] is Updated Successfully` });
    } catch (err) {
        return next(err);
    }
};
