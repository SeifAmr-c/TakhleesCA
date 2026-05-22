import crypto from 'crypto';
import { uploadToCloudinary, companyFolder, destroyCloudinaryAsset } from '../../config/cloudinary.js';
import Application from '../../Database/mongo/application.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import User from '../../Database/mongo/user.mongo.js';
import Category from '../../Database/mongo/category.mongo.js';
import Port from '../../Database/mongo/port.mongo.js';
import CompanyPayment from '../../Database/mongo/company_payment.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';
import { LISTING_FEE } from '../../config/fees.js';

const ALLOWED_PAYMENT_TYPES = ['FULL', 'PARTIAL'];
const ALLOWED_DOC_TYPES = ['National ID / Passport', 'Proof Of Payment', 'Delegation', 'Shipping Document'];

const generateTrackingNumber = () =>
    `TKL-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/* Build the four denormalized snapshot blobs from the referenced parents.
   Used at insert and on FK changes; reads small targeted projections. */
const fetchSnapshots = async ({ CompanyID, ClientID, CategoryID, PortID }) => {
    const [companyDoc, clientDoc, categoryDoc, portDoc] = await Promise.all([
        CompanyID  != null ? Company.findOne({ CompanyID }).select({ Name: 1, LogoUrl: 1 }).lean()   : null,
        ClientID   != null ? User.findOne({ UserID: ClientID }).select({ FirstName: 1, LastName: 1 }).lean() : null,
        CategoryID != null ? Category.findOne({ CategoryID }).select({ Type: 1 }).lean()             : null,
        PortID     != null ? Port.findOne({ PortID }).select({ PortName: 1, PortType: 1 }).lean()    : null,
    ]);
    return {
        company:  companyDoc  ? { Name: companyDoc.Name, LogoUrl: companyDoc.LogoUrl ?? null } : null,
        client:   clientDoc   ? { FirstName: clientDoc.FirstName, LastName: clientDoc.LastName } : null,
        category: categoryDoc ? { Type: categoryDoc.Type } : null,
        port:     portDoc     ? { PortName: portDoc.PortName, PortType: portDoc.PortType } : null,
    };
};

/* CompletionToken is the QR-handshake shared secret; only its owning
   client may read it. Strip from any other caller. */
const sanitizeApplication = (doc, req) => {
    if (!doc || typeof doc !== 'object') return doc;
    const session = req?.session;
    const callerIsOwnerClient =
        session?.role === 'client' &&
        session?.userId != null &&
        doc.ClientID != null &&
        Number(session.userId) === Number(doc.ClientID);
    if (callerIsOwnerClient) return doc;
    const { CompletionToken: _omit, ...rest } = doc;
    return rest;
};
const sanitizeApplications = (docs, req) =>
    Array.isArray(docs) ? docs.map((d) => sanitizeApplication(d, req)) : docs;

/* Shape a Mongo Application doc into the row format the dashboards
   already render. Mirrors the column set the SQL list query returned:
   denormalized client/company/category/port names + total Amount. */
const shapeListRow = (d, { includeToken = false } = {}) => {
    const Amount = (d.payments ?? []).reduce((s, p) => s + Number(p.Amount || 0), 0);
    const row = {
        ApplicationID:   d.ApplicationID,
        TrackingNumber:  d.TrackingNumber,
        Status:          d.Status,
        PaymentType:     d.PaymentType,
        SubmissionDate:  d.SubmissionDate,
        CompletionDate:  d.CompletionDate,
        DeliveryAddress: d.DeliveryAddress,
        ACID:            d.ACID,
        CompanyID:       d.CompanyID,
        ClientID:        d.ClientID,
        CategoryID:      d.CategoryID,
        PortID:          d.PortID,
        ClientName:      d.client ? `${d.client.FirstName ?? ''} ${d.client.LastName ?? ''}`.trim() : null,
        CategoryName:    d.category?.Type ?? null,
        PortName:        d.port?.PortName ?? null,
        PortType:        d.port?.PortType ?? null,
        CompanyName:     d.company?.Name ?? null,
        CompanyLogoUrl:  d.company?.LogoUrl ?? null,
        Amount,
    };
    if (includeToken) {
        row.CompletionToken = d.CompletionToken;
        row.QrPayload = d.CompletionToken ? `${d.TrackingNumber}:${d.CompletionToken}` : null;
    }
    return row;
};

export const createApplication = async (req, res, next) => {
    try {
        const ClientID = req.session?.userId;
        if (!ClientID) {
            return res.status(401).json({ ok: false, message: 'You must be signed in to file an application.' });
        }

        const CompanyID  = Number(req.body.CompanyID);
        const CategoryID = Number(req.body.CategoryID);
        const PortID     = Number(req.body.PortID);
        const DeliveryAddress = String(req.body.DeliveryAddress ?? '').trim();
        const PaymentType = String(req.body.PaymentType ?? 'FULL').toUpperCase();
        const ACID = String(req.body.ACID ?? '').trim();

        if (!CompanyID)  return res.status(400).json({ ok: false, message: 'CompanyID is required.' });
        if (!CategoryID) return res.status(400).json({ ok: false, message: 'CategoryID is required.' });
        if (!PortID)     return res.status(400).json({ ok: false, message: 'PortID is required.' });
        if (!DeliveryAddress) return res.status(400).json({ ok: false, message: 'DeliveryAddress is required.' });
        if (!ALLOWED_PAYMENT_TYPES.includes(PaymentType)) {
            return res.status(400).json({ ok: false, message: `PaymentType must be one of: ${ALLOWED_PAYMENT_TYPES.join(', ')}.` });
        }
        if (!/^\d{19}$/.test(ACID)) {
            return res.status(400).json({ ok: false, message: 'ACID must be exactly 19 digits.' });
        }

        let TrackingNumber;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const candidate = generateTrackingNumber();
            const exists = await Application.exists({ TrackingNumber: candidate });
            if (!exists) {
                TrackingNumber = candidate;
                break;
            }
        }
        if (!TrackingNumber) {
            return res.status(500).json({ ok: false, message: 'Could not allocate a unique tracking number.' });
        }

        /* Stream every uploaded document to Cloudinary in parallel,
           then attach them to the Application as embedded subdocs. */
        const files = Array.isArray(req.files) ? req.files : [];
        const uploadedDocs = [];
        if (files.length) {
            const companyDoc = await Company.findOne({ CompanyID }).select({ Name: 1 }).lean();
            const docFolder = companyFolder(companyDoc?.Name, 'documents');

            const tasks = files.map(async (file) => {
                const match = /^Document_(\d+)$/.exec(file.fieldname);
                if (!match) return null;
                const idx = match[1];
                const DocType = String(req.body[`DocType_${idx}`] ?? '').trim();
                if (!ALLOWED_DOC_TYPES.includes(DocType)) {
                    throw Object.assign(
                        new Error(`Document #${idx}: DocType must be one of ${ALLOWED_DOC_TYPES.join(', ')}.`),
                        { status: 400 }
                    );
                }
                const uploaded = await uploadToCloudinary(file.buffer, docFolder);
                return { DocType, Path: uploaded.secure_url };
            });
            const settled = (await Promise.all(tasks)).filter(Boolean);
            for (const doc of settled) {
                const DocumentID = await nextId('document');
                uploadedDocs.push({
                    DocumentID,
                    DocType: doc.DocType,
                    UploadDate: new Date(),
                    VerficationStatus: 'Pending',
                    Path: doc.Path,
                });
            }
        }

        const ApplicationID = await nextId('application');
        const SubmissionDate = new Date();
        const snaps = await fetchSnapshots({ CompanyID, ClientID, CategoryID, PortID });

        await Application.create({
            ApplicationID,
            PaymentType,
            Status: 'Pending',
            SubmissionDate,
            TrackingNumber,
            DeliveryAddress,
            ACID,
            CompanyID, ClientID, CategoryID, PortID,
            ...snaps,
            documents: uploadedDocs,
            payments: [],
        });

        return res.status(201).json({
            ok: true,
            message: 'Application filed successfully.',
            data: {
                ApplicationID,
                TrackingNumber,
                Status: 'Pending',
                Documents: uploadedDocs.map((d) => ({ DocumentID: d.DocumentID, DocType: d.DocType, Path: d.Path })),
            },
        });
    } catch (err) {
        return next(err);
    }
};

/* Company dashboard list — Pending + Completed only, newest first. */
export const listCompanyApplications = async (req, res, next) => {
    try {
        const CompanyID = req.session?.companyId;
        if (!CompanyID) {
            return res.status(401).json({ ok: false, message: 'Company sign-in required.' });
        }
        const docs = await Application
            .find({ CompanyID, Status: { $in: ['Pending', 'Completed'] } })
            .sort({ ApplicationID: -1 })
            .lean();
        return res.json(docs.map((d) => shapeListRow(d, { includeToken: false })));
    } catch (err) {
        return next(err);
    }
};

/* Client tracking screen — owner is the session user, so CompletionToken
   is safe to include for the QR render. */
export const listClientApplications = async (req, res, next) => {
    try {
        const ClientID = req.session?.userId;
        if (!ClientID) {
            return res.status(401).json({ ok: false, message: 'Authentication required.' });
        }
        const docs = await Application
            .find({ ClientID })
            .sort({ ApplicationID: -1 })
            .lean();
        return res.json(docs.map((d) => shapeListRow(d, { includeToken: true })));
    } catch (err) {
        return next(err);
    }
};

export const getApplication = async (req, res, next) => {
    try {
        const { ApplicationID, CompanyID, ClientID } = req.query;

        if (ApplicationID !== undefined && ApplicationID !== '' && ApplicationID !== '%') {
            const doc = await Application.findOne({ ApplicationID: Number(ApplicationID) }).lean();
            return res.json(doc ? [sanitizeApplication(doc, req)] : []);
        }

        const filter = {};
        if (CompanyID) filter.CompanyID = Number(CompanyID);
        if (ClientID)  filter.ClientID  = Number(ClientID);

        const docs = await Application.find(filter).sort({ ApplicationID: -1 }).lean();
        return res.json(sanitizeApplications(docs.map((d) => ({ ...d, ...shapeListRow(d, { includeToken: false }) })), req));
    } catch (err) {
        return next(err);
    }
};

export const cancelApplication = async (req, res, next) => {
    try {
        const ClientID = req.session?.userId;
        if (!ClientID) {
            return res.status(401).json({ ok: false, message: "Authentication required." });
        }

        const ApplicationID = Number(req.params.id);
        if (!Number.isInteger(ApplicationID) || ApplicationID < 1) {
            return res.status(400).json({ ok: false, message: "Invalid application id." });
        }

        const result = await Application.deleteOne({
            ApplicationID,
            ClientID,
            Status: 'Pending',
        });
        if (!result.deletedCount) {
            return res.status(400).json({ ok: false, message: "Application cannot be cancelled." });
        }
        return res.status(200).json({ ok: true, message: "Application cancelled successfully." });
    } catch (err) {
        return next(err);
    }
};

/* Company-initiated rejection. We delete the application outright rather
   than parking it in a 'Rejected' state so no stale row, embedded
   document/payment, or Cloudinary asset is left behind.

   Gating on Status: 'Pending' is the referential-integrity guarantee: a
   Review (Review.ApplicationID) is only written after completion, so a
   Pending app has none. A CompanyPayment row, however, is opened at the
   client's checkout (the 5% FixedFee) — before accept — and is keyed by
   the payment's PaymentID. So we must drop those ledger rows too, otherwise
   deleting the app would orphan them (and the client is owed that 5% back
   anyway since the company refused the job). On a Pending app those rows
   only carry the FixedFee — commission/listing are added on accept. */
export const rejectApplication = async (req, res, next) => {
    try {
        const CompanyID = req.session?.companyId;
        if (!CompanyID) {
            return res.status(401).json({ ok: false, message: "Company sign-in required." });
        }

        const ApplicationID = Number(req.params.id);
        if (!Number.isInteger(ApplicationID) || ApplicationID < 1) {
            return res.status(400).json({ ok: false, message: "Invalid application id." });
        }

        const app = await Application.findOne({ ApplicationID, CompanyID, Status: 'Pending' });
        if (!app) {
            return res.status(404).json({
                ok: false,
                message: "No pending application found for your company with that id.",
            });
        }

        // Drop the uploaded files from Cloudinary before the subdocs vanish
        // with the parent. Best-effort: destroyCloudinaryAsset swallows errors.
        await Promise.all((app.documents ?? []).map((d) => destroyCloudinaryAsset(d.Path)));

        // Remove the ledger rows opened by this app's payment(s) so no
        // CompanyPayment is left pointing at a deleted payment.
        const paymentIds = (app.payments ?? []).map((p) => p.PaymentID).filter((id) => id != null);
        if (paymentIds.length) {
            await CompanyPayment.deleteMany({ PaymentID: { $in: paymentIds } });
        }

        await Application.deleteOne({ ApplicationID, CompanyID, Status: 'Pending' });

        return res.status(200).json({ ok: true, message: `Application #${ApplicationID} rejected and removed.` });
    } catch (err) {
        return next(err);
    }
};

export const deleteApplication = async (req, res, next) => {
    try {
        const id = Number(req.query.ApplicationID);
        const result = await Application.deleteOne({ ApplicationID: id });
        if (!result.deletedCount) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${id}] does not exist or has already been deleted.`,
            });
        }
        return res.status(200).json({ Status: "OK", Message: `Record Id [${id}] deleted Successfully` });
    } catch (err) {
        return next(err);
    }
};

export const searchApplication = async (req, res, next) => {
    try {
        const { keyword, keyvalue } = req.query;
        const sort = req.query.sort?.toUpperCase() === 'DESC' ? -1 : 1;

        const allowedColumns = ['ApplicationID', 'PaymentType', 'TrackingNumber', 'Status', 'CompanyID', 'CategoryID', 'ClientID', 'PortID'];
        if (!allowedColumns.includes(keyword)) {
            return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
        }
        if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

        const numericKeys = new Set(['ApplicationID', 'CompanyID', 'CategoryID', 'ClientID', 'PortID']);
        const value = numericKeys.has(keyword) ? Number(keyvalue) : keyvalue;

        const docs = await Application.find({ [keyword]: value }).sort({ ApplicationID: sort }).lean();
        return res.json(sanitizeApplications(docs, req));
    } catch (err) {
        return next(err);
    }
};

/* QR handshake — the company scans the QR rendered on the client's
   screen. Payload is `TrackingNumber:CompletionToken`. */
export const completeViaQr = async (req, res, next) => {
    try {
        const CompanyID = req.session?.companyId;
        if (!CompanyID) {
            return res.status(401).json({ ok: false, message: 'Company sign-in required.' });
        }

        const qrPayload = String(req.body?.qrPayload ?? '').trim();
        if (!qrPayload) {
            return res.status(400).json({ ok: false, message: 'qrPayload is required.' });
        }
        const sepIdx = qrPayload.indexOf(':');
        if (sepIdx <= 0 || sepIdx === qrPayload.length - 1) {
            return res.status(400).json({ ok: false, message: 'qrPayload must be in the format "TrackingNumber:Token".' });
        }
        const trackingNumber = qrPayload.slice(0, sepIdx).trim();
        const token = qrPayload.slice(sepIdx + 1).trim();
        if (!trackingNumber || !token) {
            return res.status(400).json({ ok: false, message: 'qrPayload must contain both a tracking number and a token.' });
        }

        const app = await Application.findOne({ CompletionToken: token });
        if (!app) {
            return res.status(404).json({ ok: false, message: 'No active shipment matches this QR code.' });
        }
        if (app.TrackingNumber !== trackingNumber) {
            return res.status(400).json({ ok: false, message: 'QR payload tracking number does not match the token.' });
        }
        if (Number(app.CompanyID) !== Number(CompanyID)) {
            return res.status(403).json({ ok: false, message: 'This shipment does not belong to your company.' });
        }
        if (app.Status !== 'In Progress') {
            return res.status(409).json({ ok: false, message: `Shipment is "${app.Status}", not "In Progress".` });
        }

        await Application.updateOne(
            { ApplicationID: app.ApplicationID },
            {
                $set: {
                    Status: 'Completed',
                    CompletionDate: new Date(),
                    CompletionToken: null,
                    'documents.$[].VerficationStatus': 'Accepted',
                },
            }
        );

        return res.status(200).json({
            ok: true,
            message: 'Shipment marked as completed.',
            data: {
                ApplicationID: app.ApplicationID,
                TrackingNumber: app.TrackingNumber,
                Status: 'Completed',
            },
        });
    } catch (err) {
        return next(err);
    }
};

export const updateApplication = async (req, res, next) => {
    try {
        const ApplicationID = Number(req.query.ApplicationID);
        const existing = await Application.findOne({ ApplicationID });
        if (!existing) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${ApplicationID}] does not exist or has already been deleted. Update aborted.`,
            });
        }

        const PaymentType     = req.body.PaymentType     !== undefined ? req.body.PaymentType     : existing.PaymentType;
        const SubmissionDate  = req.body.SubmissionDate  !== undefined ? req.body.SubmissionDate  : existing.SubmissionDate;
        const TrackingNumber  = req.body.TrackingNumber  !== undefined ? req.body.TrackingNumber  : existing.TrackingNumber;
        const Status          = req.body.Status          !== undefined ? req.body.Status          : existing.Status;
        const DeliveryAddress = req.body.DeliveryAddress !== undefined ? req.body.DeliveryAddress : existing.DeliveryAddress;
        const CompanyID       = req.body.CompanyID       !== undefined ? Number(req.body.CompanyID)  : existing.CompanyID;
        const ClientID        = req.body.ClientID        !== undefined ? Number(req.body.ClientID)   : existing.ClientID;
        const CategoryID      = req.body.CategoryID      !== undefined ? Number(req.body.CategoryID) : existing.CategoryID;
        const PortID          = req.body.PortID          !== undefined ? Number(req.body.PortID)     : existing.PortID;

        const newStatus = String(Status);
        const isCompleting = newStatus === 'Completed';
        /* Revenue tracking fires once, on the first transition into an
           active state. The schema enum allows both 'In Progress' and
           'Accepted' for that state; the frontend uses 'In Progress',
           so gating on 'Accepted' alone never triggered. */
        const ACTIVE_STATES = new Set(['In Progress', 'Accepted']);
        const isAccepting = ACTIVE_STATES.has(newStatus) && !ACTIVE_STATES.has(existing.Status);
        /* QR token is minted on the first transition INTO In Progress
           and reused on subsequent saves so the currently-displayed QR
           stays valid until completion. */
        const isStartingProgress = newStatus === 'In Progress' && existing.Status !== 'In Progress';
        const CompletionDate = req.body.CompletionDate !== undefined
            ? req.body.CompletionDate
            : (isCompleting ? new Date() : existing.CompletionDate);
        const CompletionToken = isStartingProgress && !existing.CompletionToken
            ? crypto.randomUUID()
            : existing.CompletionToken;

        const fkChanged =
            Number(existing.CompanyID)  !== Number(CompanyID) ||
            Number(existing.ClientID)   !== Number(ClientID) ||
            Number(existing.CategoryID) !== Number(CategoryID) ||
            Number(existing.PortID)     !== Number(PortID);
        const snaps = fkChanged ? await fetchSnapshots({ CompanyID, ClientID, CategoryID, PortID }) : null;

        const $set = {
            PaymentType,
            Status: newStatus,
            SubmissionDate: SubmissionDate ? new Date(SubmissionDate) : null,
            TrackingNumber,
            DeliveryAddress,
            CompletionDate: CompletionDate ? new Date(CompletionDate) : null,
            CompletionToken,
            CompanyID, ClientID, CategoryID, PortID,
            ...(snaps ?? {}),
            ...(isCompleting ? { 'documents.$[].VerficationStatus': 'Accepted' } : {}),
        };
        await Application.updateOne({ ApplicationID }, { $set });

        /* On accept: finish booking platform revenue onto the SAME
           CompanyPayment row the client's checkout already opened with the
           5% FixedFee. We add Commission (price * Comm%) plus the listing
           fee — but the listing fee is flat per company per CALENDAR MONTH,
           so it's only applied if this company has no other row carrying a
           ListingFee yet this month. */
        if (isAccepting) {
            const apDoc = await Application.findOne({ ApplicationID }).lean();
            const lastPayment = (apDoc?.payments ?? []).at(-1);
            if (!lastPayment) {
                const e = new Error('Cannot accept an application with no payment on record.');
                e.status = 409;
                throw e;
            }
            const company = await Company.findOne({ CompanyID }).select({ Comm: 1, Name: 1 }).lean();
            if (!company) {
                const e = new Error('Accepting company not found.');
                e.status = 404;
                throw e;
            }
            const comm = Number(company.Comm) || 0;
            const Commission = Math.round(Number(lastPayment.Amount) * (comm / 100) * 100) / 100;

            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const listingAlreadyCharged = await CompanyPayment.exists({
                CompanyID,
                ListingFee: { $gt: 0 },
                PaymentDate: { $gte: monthStart, $lt: nextMonthStart },
            });
            const ListingFee = listingAlreadyCharged ? 0 : LISTING_FEE;

            /* The ledger row was created at checkout keyed by this PaymentID;
               update it in place so one record holds FixedFee + Commission +
               ListingFee. Fall back to creating it if it's somehow missing
               (e.g. legacy payment booked before this flow existed). */
            const existing = await CompanyPayment.findOne({ PaymentID: lastPayment.PaymentID });
            if (existing) {
                const FixedFee = Number(existing.FixedFee) || 0;
                await CompanyPayment.updateOne(
                    { _id: existing._id },
                    { $set: {
                        Commission,
                        ListingFee,
                        Amount: Math.round((FixedFee + Commission + ListingFee) * 100) / 100,
                        CompanyID,
                        company: { Name: company.Name },
                    } }
                );
            } else {
                const CompanyPaymentID = await nextId('company_payment');
                await CompanyPayment.create({
                    CompanyPaymentID,
                    PaymentDate: new Date(),
                    Amount: Math.round((Commission + ListingFee) * 100) / 100,
                    FixedFee: 0,
                    Commission,
                    ListingFee,
                    CompanyID,
                    PaymentID: lastPayment.PaymentID,
                    company: { Name: company.Name },
                });
            }
        }

        return res.status(200).json({
            Status: "OK",
            Message: `Record Id [${ApplicationID}] is Updated Successfully`,
        });
    } catch (err) {
        return next(err);
    }
};
