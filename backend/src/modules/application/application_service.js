import db from '../../Database/connection.js';
import crypto from 'crypto';
import { uploadToCloudinary } from '../../config/cloudinary.js';

const runQuery = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });

const ALLOWED_PAYMENT_TYPES = ['FULL', 'PARTIAL'];
const ALLOWED_DOC_TYPES = ['National ID / Passport', 'Proof Of Payment', 'Delegation', 'Shipping Document'];

/* Server-generated tracking number. Format: TKL-<8 hex chars>-<6 hex chars>.
   The composite is collision-resistant in practice; we still re-roll on
   the rare uniqueness violation. */
const generateTrackingNumber = () =>
    `TKL-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/* The CompletionToken is the shared secret of the QR handshake — the
   ONLY caller allowed to see it is the client who owns the row. Anyone
   else (company, admin, unauthenticated would-be readers) must get a
   payload with CompletionToken stripped. We delete the key entirely
   rather than null-it so it cannot be re-introduced via spread. */
const sanitizeApplicationRow = (row, req) => {
    if (!row || typeof row !== 'object') return row;
    const session = req?.session;
    const callerIsOwnerClient =
        session?.role === 'client' &&
        session?.userId != null &&
        row.ClientID != null &&
        Number(session.userId) === Number(row.ClientID);
    if (callerIsOwnerClient) return row;
    const { CompletionToken: _omit, ...rest } = row;
    return rest;
};

const sanitizeApplicationRows = (rows, req) =>
    Array.isArray(rows) ? rows.map((row) => sanitizeApplicationRow(row, req)) : rows;

export const createApplication = async (req, res, next) => {
    try {
        /* The application is filed by the logged-in client. The signed-in
           client's UserID is also their ClientID (single-table inheritance). */
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

        /* Server-side defaults for the columns the form doesn't (and shouldn't)
           supply: SubmissionDate (now), TrackingNumber (generated), Status (Pending). */
        let TrackingNumber;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const candidate = generateTrackingNumber();
            const existing = await runQuery(
                'SELECT 1 FROM application WHERE TrackingNumber = ? LIMIT 1',
                [candidate]
            );
            if (existing.length === 0) {
                TrackingNumber = candidate;
                break;
            }
        }
        if (!TrackingNumber) {
            return res.status(500).json({ ok: false, message: 'Could not allocate a unique tracking number.' });
        }

        const result = await runQuery(
            `INSERT INTO application
                (PaymentType, CompletionDate, SubmissionDate, TrackingNumber, Status, DeliveryAddress, ACID, CompanyID, CategoryID, ClientID, PortID)
             VALUES (?, NULL, NOW(), ?, 'Pending', ?, ?, ?, ?, ?, ?)`,
            [PaymentType, TrackingNumber, DeliveryAddress, ACID, CompanyID, CategoryID, ClientID, PortID]
        );

        const ApplicationID = result.insertId;

        /* Document fan-out. Files arrive with indexed field names like
           "Document_0" through "Document_3"; the matching DocType arrives
           as "DocType_0".."DocType_3" in req.body. We upload each file to
           Cloudinary in parallel, then insert one document row per file. */
        const files = Array.isArray(req.files) ? req.files : [];
        const uploadedDocs = [];
        if (files.length) {
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
                const uploaded = await uploadToCloudinary(file.buffer, 'takhlees/documents');
                return { DocType, Path: uploaded.secure_url };
            });
            const settled = (await Promise.all(tasks)).filter(Boolean);
            for (const doc of settled) {
                await runQuery(
                    'INSERT INTO document (DocType, UploadDate, VerficationStatus, Path, ApplicationID) VALUES (?, NOW(), ?, ?, ?)',
                    [doc.DocType, 'Pending', doc.Path, ApplicationID]
                );
                uploadedDocs.push(doc);
            }
        }

        return res.status(201).json({
            ok: true,
            message: 'Application filed successfully.',
            data: {
                ApplicationID,
                TrackingNumber,
                Status: 'Pending',
                Documents: uploadedDocs,
            },
        });
    } catch (err) {
        return next(err);
    }
};

/* Mobile company dashboard: list applications assigned to the signed-in
   company. Only returns rows with Status in ('Pending','Completed') so
   the screen excludes Accepted/Rejected applications. */
export const listCompanyApplications = (req, res, next) => {
    const CompanyID = req.session?.companyId;
    if (!CompanyID) {
        return res.status(401).json({ ok: false, message: 'Company sign-in required.' });
    }

    const sql = `
        SELECT
            a.ApplicationID, a.TrackingNumber, a.Status, a.PaymentType,
            a.SubmissionDate, a.CompletionDate, a.DeliveryAddress, a.ACID,
            a.CompanyID, a.ClientID, a.CategoryID, a.PortID,
            CONCAT(u.FirstName, ' ', u.LastName) AS ClientName,
            cat.Type    AS CategoryName,
            p.PortName  AS PortName,
            p.PortType  AS PortType,
            co.Name     AS CompanyName,
            co.LogoUrl  AS CompanyLogoUrl,
            COALESCE((SELECT SUM(pay.Amount) FROM payment pay WHERE pay.ApplicationID = a.ApplicationID), 0) AS Amount
        FROM application a
        LEFT JOIN client cl    ON cl.ClientID    = a.ClientID
        LEFT JOIN user u       ON u.UserID       = cl.ClientID
        LEFT JOIN category cat ON cat.CategoryID = a.CategoryID
        LEFT JOIN port p       ON p.PortID       = a.PortID
        LEFT JOIN company co   ON co.CompanyID   = a.CompanyID
        WHERE a.CompanyID = ? AND a.Status IN ('Pending', 'Completed')
        ORDER BY a.ApplicationID DESC
    `;

    db.query(sql, [CompanyID], (err, result) => {
        if (err) return next(err);
        return res.json(result);
    });
};

/* Mobile client tracking screen: list the signed-in client's own
   applications. Caller is always the owner (filter is the session's
   userId), so CompletionToken is safe to expose — the phone needs it
   to render the QR the company will scan. QrPayload is the exact
   format completeViaQr expects ("TrackingNumber:Token"); it is null
   until the application enters 'In Progress' and the token is minted. */
export const listClientApplications = (req, res, next) => {
    const ClientID = req.session?.userId;
    if (!ClientID) {
        return res.status(401).json({ ok: false, message: 'Authentication required.' });
    }

    const sql = `
        SELECT
            a.ApplicationID, a.TrackingNumber, a.Status, a.PaymentType,
            a.SubmissionDate, a.CompletionDate, a.DeliveryAddress, a.ACID,
            a.CompanyID, a.ClientID, a.CategoryID, a.PortID,
            a.CompletionToken,
            CASE
                WHEN a.CompletionToken IS NULL OR a.CompletionToken = '' THEN NULL
                ELSE CONCAT(a.TrackingNumber, ':', a.CompletionToken)
            END AS QrPayload,
            cat.Type    AS CategoryName,
            p.PortName  AS PortName,
            p.PortType  AS PortType,
            co.Name     AS CompanyName,
            co.LogoUrl  AS CompanyLogoUrl,
            COALESCE((SELECT SUM(pay.Amount) FROM payment pay WHERE pay.ApplicationID = a.ApplicationID), 0) AS Amount
        FROM application a
        LEFT JOIN category cat ON cat.CategoryID = a.CategoryID
        LEFT JOIN port p       ON p.PortID       = a.PortID
        LEFT JOIN company co   ON co.CompanyID   = a.CompanyID
        WHERE a.ClientID = ?
        ORDER BY a.ApplicationID DESC
    `;

    db.query(sql, [ClientID], (err, result) => {
        if (err) return next(err);
        return res.json(result);
    });
};

export const getApplication = (req, res) => {
    const ApplicationID = req.query.ApplicationID;
    const CompanyID = req.query.CompanyID;
    const ClientID = req.query.ClientID;

    if (ApplicationID !== undefined && ApplicationID !== '' && ApplicationID !== '%') {
        db.query(
            "SELECT * FROM application WHERE ApplicationID = ?",
            [ApplicationID],
            function (err, result) {
                if (err) throw err;
                res.json(sanitizeApplicationRows(result, req));
            }
        );
        return;
    }

    /* List view enriched with everything the dashboards need so they
       don't have to make N+1 follow-up requests:
         - ClientName  : joined from User via Client.ClientID -> User.UserID
         - CategoryName: Category.Type
         - PortName, PortType
         - CompanyName : Company.Name
         - Amount      : sum of Payments rows for the application (NULL -> 0) */
    const where = [];
    const params = [];
    if (CompanyID) { where.push("a.CompanyID = ?"); params.push(CompanyID); }
    if (ClientID)  { where.push("a.ClientID = ?");  params.push(ClientID);  }

    const sql = `
        SELECT
            a.*,
            CONCAT(u.FirstName, ' ', u.LastName) AS ClientName,
            cat.Type     AS CategoryName,
            p.PortName   AS PortName,
            p.PortType   AS PortType,
            co.Name      AS CompanyName,
            co.LogoUrl   AS CompanyLogoUrl,
            COALESCE((SELECT SUM(pay.Amount) FROM payment pay WHERE pay.ApplicationID = a.ApplicationID), 0) AS Amount
        FROM application a
        LEFT JOIN client cl   ON cl.ClientID   = a.ClientID
        LEFT JOIN user u      ON u.UserID      = cl.ClientID
        LEFT JOIN category cat ON cat.CategoryID = a.CategoryID
        LEFT JOIN port p      ON p.PortID      = a.PortID
        LEFT JOIN company co  ON co.CompanyID  = a.CompanyID
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY a.ApplicationID DESC
    `;

    db.query(sql, params, function (err, result) {
        if (err) throw err;
        res.json(sanitizeApplicationRows(result, req));
    });
};

/* DELETE /application/:id/cancel  (requires client session)
   Client-initiated cancellation. Only Pending rows belonging to the
   signed-in client can be cancelled; anything in progress or further
   along must be handled by the company side. */
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

        const result = await runQuery(
            "DELETE FROM application WHERE ApplicationID = ? AND ClientID = ? AND Status = 'Pending'",
            [ApplicationID, ClientID]
        );

        if (!result.affectedRows) {
            return res.status(400).json({ ok: false, message: "Application cannot be cancelled." });
        }

        return res.status(200).json({ ok: true, message: "Application cancelled successfully." });
    } catch (err) {
        return next(err);
    }
};

export const deleteApplication = (req, res) => {
    const ApplicationID = req.query.ApplicationID;

    db.query("SELECT ApplicationID FROM application WHERE ApplicationID = ?", [ApplicationID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + ApplicationID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM application WHERE ApplicationID = ?", [ApplicationID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + ApplicationID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + ApplicationID + "] received");
        });
    });
};

export const searchApplication = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['ApplicationID', 'PaymentType', 'TrackingNumber', 'Status', 'CompanyID', 'CategoryID', 'ClientID', 'PortID'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM application WHERE ${keyword} = ? ORDER BY ApplicationID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(sanitizeApplicationRows(result, req));
    });
};

/* QR handshake: the company physically scans the QR rendered on the
   client's screen. The payload is `TrackingNumber:CompletionToken`; we
   verify the token belongs to the scanning company and that the app is
   currently 'In Progress', then mark it 'Completed' and burn the token. */
export const completeViaQr = async (req, res, next) => {
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

    const conn = await db.pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            "SELECT * FROM application WHERE CompletionToken = ? LIMIT 1",
            [token]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ ok: false, message: 'No active shipment matches this QR code.' });
        }
        const app = rows[0];

        if (String(app.TrackingNumber) !== trackingNumber) {
            await conn.rollback();
            return res.status(400).json({ ok: false, message: 'QR payload tracking number does not match the token.' });
        }
        if (Number(app.CompanyID) !== Number(CompanyID)) {
            await conn.rollback();
            return res.status(403).json({ ok: false, message: 'This shipment does not belong to your company.' });
        }
        if (String(app.Status) !== 'In Progress') {
            await conn.rollback();
            return res.status(409).json({ ok: false, message: `Shipment is "${app.Status}", not "In Progress".` });
        }

        await conn.query(
            "UPDATE application SET Status = 'Completed', CompletionDate = NOW(), CompletionToken = NULL WHERE ApplicationID = ?",
            [app.ApplicationID]
        );
        await conn.query(
            "UPDATE document SET VerficationStatus = 'Accepted' WHERE ApplicationID = ?",
            [app.ApplicationID]
        );

        await conn.commit();
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
        try { await conn.rollback(); } catch { /* ignore */ }
        return next(err);
    } finally {
        conn.release();
    }
};

export const updateApplication = async (req, res, next) => {
    const ApplicationID = req.query.ApplicationID;
    const conn = await db.pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            "SELECT * FROM application WHERE ApplicationID = ?",
            [ApplicationID]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                Status: "Error",
                Message: "Record Id [" + ApplicationID + "] does not exist or has already been deleted. Update aborted.",
            });
        }

        const existing        = rows[0];
        const PaymentType     = req.body.PaymentType     !== undefined ? req.body.PaymentType     : existing.PaymentType;
        const SubmissionDate  = req.body.SubmissionDate  !== undefined ? req.body.SubmissionDate  : existing.SubmissionDate;
        const TrackingNumber  = req.body.TrackingNumber  !== undefined ? req.body.TrackingNumber  : existing.TrackingNumber;
        const Status          = req.body.Status          !== undefined ? req.body.Status          : existing.Status;
        const DeliveryAddress = req.body.DeliveryAddress !== undefined ? req.body.DeliveryAddress : existing.DeliveryAddress;
        const CompanyID       = req.body.CompanyID       !== undefined ? req.body.CompanyID       : existing.CompanyID;
        const ClientID        = req.body.ClientID        !== undefined ? req.body.ClientID        : existing.ClientID;
        const CategoryID      = req.body.CategoryID      !== undefined ? req.body.CategoryID      : existing.CategoryID;
        const PortID          = req.body.PortID          !== undefined ? req.body.PortID          : existing.PortID;

        const newStatus = String(Status);
        const isCompleting = newStatus === 'Completed';
        /* Revenue tracking only fires on the transition INTO Accepted —
           re-saving an application that's already Accepted must not
           double-insert a CompanyPayment row. */
        const isAccepting = newStatus === 'Accepted' && String(existing.Status) !== 'Accepted';
        /* The QR handshake token is minted on the first transition into
           'In Progress'. We don't re-roll on subsequent saves so the token
           the client is currently displaying stays valid until completion. */
        const isStartingProgress = newStatus === 'In Progress' && String(existing.Status) !== 'In Progress';
        const CompletionDate = req.body.CompletionDate !== undefined
            ? req.body.CompletionDate
            : (isCompleting ? new Date() : existing.CompletionDate);
        const CompletionToken = isStartingProgress && !existing.CompletionToken
            ? crypto.randomUUID()
            : existing.CompletionToken;

        await conn.query(
            "UPDATE application SET `PaymentType` = ?, `CompletionDate` = ?, `SubmissionDate` = ?, `TrackingNumber` = ?, `Status` = ?, `DeliveryAddress` = ?, `CompletionToken` = ?, `CompanyID` = ?, `CategoryID` = ?, `ClientID` = ?, `PortID` = ? WHERE ApplicationID = ?",
            [PaymentType, CompletionDate, SubmissionDate, TrackingNumber, Status, DeliveryAddress, CompletionToken, CompanyID, CategoryID, ClientID, PortID, ApplicationID]
        );

        if (isCompleting) {
            await conn.query(
                "UPDATE document SET VerficationStatus = 'Accepted' WHERE ApplicationID = ?",
                [ApplicationID]
            );
        }

        /* On accept: book Takhlees' platform revenue into CompanyPayment.
           Formula: 1600 (fixed listing fee) + Amount * Comm / 100.
           Runs inside the same transaction so the financial row can't
           drift from the application's status. */
        if (isAccepting) {
            const [paymentRows] = await conn.query(
                "SELECT PaymentID, Amount FROM payment WHERE ApplicationID = ? ORDER BY PaymentID DESC LIMIT 1",
                [ApplicationID]
            );
            if (paymentRows.length === 0) {
                throw Object.assign(
                    new Error('Cannot accept an application with no payment on record.'),
                    { status: 409 }
                );
            }
            const { PaymentID, Amount: paymentAmount } = paymentRows[0];

            const [companyRows] = await conn.query(
                "SELECT Comm FROM company WHERE CompanyID = ? LIMIT 1",
                [CompanyID]
            );
            if (companyRows.length === 0) {
                throw Object.assign(
                    new Error('Accepting company not found.'),
                    { status: 404 }
                );
            }
            const comm = Number(companyRows[0].Comm);
            const revenue = 1600 + (Number(paymentAmount) * (comm / 100));

            await conn.query(
                "INSERT INTO companypayment (PaymentDate, Amount, CompanyID, PaymentID) VALUES (NOW(), ?, ?, ?)",
                [revenue, CompanyID, PaymentID]
            );
        }

        await conn.commit();
        return res.status(200).json({
            Status: "OK",
            Message: "Record Id [" + ApplicationID + "] is Updated Successfully",
        });
    } catch (err) {
        try { await conn.rollback(); } catch { /* ignore */ }
        return next(err);
    } finally {
        conn.release();
    }
};