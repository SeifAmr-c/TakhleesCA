import db from '../../Database/connection.js';
import { uploadToCloudinary, companyFolder } from '../../config/cloudinary.js';
import Application from '../../Database/mongo/application.mongo.js';
import { mirror } from '../../Database/mongo/dual_write.js';

const runQuery = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });

const DOC_TYPES = ['National ID / Passport', 'Proof Of Payment', 'Delegation', 'Shipping Document'];
const VERIFICATION_STATUSES = ['Pending', 'Accepted', 'Rejected'];

/* Upload handler — multer keeps the file in memory; we stream the buffer
   to Cloudinary and persist the returned secure_url in document.Path. */
export const createDocumentWithFile = async (req, res, next) => {
    try {
        const DocType = String(req.body.DocType ?? '').trim();
        const ApplicationID = Number(req.body.ApplicationID);

        if (!ApplicationID) {
            return res.status(400).json({ ok: false, message: 'ApplicationID is required.' });
        }
        if (!DOC_TYPES.includes(DocType)) {
            return res.status(400).json({
                ok: false,
                message: `DocType must be one of: ${DOC_TYPES.join(', ')}.`,
            });
        }
        if (!req.file) {
            return res.status(400).json({ ok: false, message: 'File is required.' });
        }

        const appRows = await runQuery(
            `SELECT a.ApplicationID, c.Name AS CompanyName
               FROM application a
               LEFT JOIN company c ON c.CompanyID = a.CompanyID
              WHERE a.ApplicationID = ? LIMIT 1`,
            [ApplicationID]
        );
        if (!appRows.length) {
            return res.status(404).json({ ok: false, message: `Application ${ApplicationID} not found.` });
        }

        const uploaded = await uploadToCloudinary(req.file.buffer, companyFolder(appRows[0].CompanyName, 'documents'));
        const filePath = uploaded.secure_url;
        const result = await runQuery(
            'INSERT INTO document (DocType, UploadDate, VerficationStatus, Path, ApplicationID) VALUES (?, NOW(), ?, ?, ?)',
            [DocType, 'Pending', filePath, ApplicationID]
        );

        await mirror(`document.createWithFile mysqlDocumentId=${result.insertId}`, () =>
            Application.updateOne(
                { mysqlApplicationId: ApplicationID },
                { $push: { documents: {
                    mysqlDocumentId: result.insertId,
                    DocType,
                    UploadDate: new Date(),
                    VerficationStatus: 'Pending',
                    Path: filePath,
                } } }
            )
        );

        return res.status(201).json({
            ok: true,
            message: 'Document uploaded and recorded.',
            data: { DocumentID: result.insertId, DocType, ApplicationID, Path: filePath },
        });
    } catch (err) {
        return next(err);
    }
};

export const getDocumentsByApplication = (req, res) => {
    const { ApplicationID } = req.query;
    if (!ApplicationID) {
        return res.status(400).json({ error: 'ApplicationID is required' });
    }
    db.query(
        'SELECT DocumentID, DocType, Path, UploadDate, VerficationStatus FROM document WHERE ApplicationID = ? ORDER BY DocumentID ASC',
        [ApplicationID],
        function (err, result) {
            if (err) throw err;
            res.json(result);
        }
    );
};

export const createDocument = async (req, res, next) => {
    try {
        const DocType = String(req.body.DocType ?? '').trim();
        const ApplicationID = Number(req.body.ApplicationID);
        const Path = String(req.body.Path ?? '').trim() || 'unsaved';

        /* VerficationStatus is NOT NULL in the schema; we default new docs
           to 'Pending' so the form doesn't have to know about review state. */
        const VerficationStatus = req.body.VerficationStatus ?? 'Pending';

        if (!ApplicationID) {
            return res.status(400).json({ ok: false, message: 'ApplicationID is required.' });
        }
        if (!DOC_TYPES.includes(DocType)) {
            return res.status(400).json({
                ok: false,
                message: `DocType must be one of: ${DOC_TYPES.join(', ')}.`,
            });
        }
        if (!VERIFICATION_STATUSES.includes(VerficationStatus)) {
            return res.status(400).json({
                ok: false,
                message: `VerficationStatus must be one of: ${VERIFICATION_STATUSES.join(', ')}.`,
            });
        }

        const exists = await runQuery(
            'SELECT 1 FROM application WHERE ApplicationID = ? LIMIT 1',
            [ApplicationID]
        );
        if (!exists.length) {
            return res.status(404).json({ ok: false, message: `Application ${ApplicationID} not found.` });
        }

        const result = await runQuery(
            'INSERT INTO document (DocType, UploadDate, VerficationStatus, Path, ApplicationID) VALUES (?, NOW(), ?, ?, ?)',
            [DocType, VerficationStatus, Path, ApplicationID]
        );

        await mirror(`document.create mysqlDocumentId=${result.insertId}`, () =>
            Application.updateOne(
                { mysqlApplicationId: ApplicationID },
                { $push: { documents: {
                    mysqlDocumentId: result.insertId,
                    DocType,
                    UploadDate: new Date(),
                    VerficationStatus,
                    Path,
                } } }
            )
        );

        return res.status(201).json({
            ok: true,
            message: 'Document metadata recorded.',
            data: { DocumentID: result.insertId, DocType, ApplicationID, Path },
        });
    } catch (err) {
        return next(err);
    }
};

export const getDocument = (req, res) => {
    const DocumentID = req.query.DocumentID;
    if (DocumentID == '%') {
        db.query("SELECT * FROM document where DocumentID LIKE ?", [DocumentID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM document where DocumentID = ?", [DocumentID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteDocument = (req, res) => {
    const DocumentID = req.query.DocumentID;

    db.query("SELECT DocumentID FROM document WHERE DocumentID = ?", [DocumentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + DocumentID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM document WHERE DocumentID = ?", [DocumentID], function (err, result) {
            if (err) throw err;
            mirror(`document.delete mysqlDocumentId=${DocumentID}`, () =>
                Application.updateOne(
                    { 'documents.mysqlDocumentId': Number(DocumentID) },
                    { $pull: { documents: { mysqlDocumentId: Number(DocumentID) } } }
                )
            );
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + DocumentID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + DocumentID + "] received");
        });
    });
};

export const searchDocument = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['DocumentID', 'DocType', 'VerficationStatus', 'ApplicationID'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM document WHERE ${keyword} = ? ORDER BY DocumentID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};

export const updateDocument = (req, res) => {
    console.log("PUT Request Received");
    const DocumentID = req.query.DocumentID;

    db.query("SELECT * FROM document WHERE DocumentID = ?", [DocumentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + DocumentID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing          = result[0];
        const DocType           = req.body.DocType           !== undefined ? req.body.DocType           : existing.DocType;
        const UploadDate        = req.body.UploadDate        !== undefined ? req.body.UploadDate        : existing.UploadDate;
        const VerficationStatus = req.body.VerficationStatus !== undefined ? req.body.VerficationStatus : existing.VerficationStatus;
        const Path              = req.body.Path              !== undefined ? req.body.Path              : existing.Path;
        const ApplicationID     = req.body.ApplicationID     !== undefined ? req.body.ApplicationID     : existing.ApplicationID;

        db.query(
            "UPDATE document SET `DocType` = ?, `UploadDate` = ?, `VerficationStatus` = ?, `Path` = ?, `ApplicationID` = ? WHERE DocumentID = ?",
            [DocType, UploadDate, VerficationStatus, Path, ApplicationID, DocumentID],
            function (err, result) {
                if (err) throw err;
                mirror(`document.update mysqlDocumentId=${DocumentID}`, () =>
                    /* Positional-$ scoped to the matching subdoc. */
                    Application.updateOne(
                        { 'documents.mysqlDocumentId': Number(DocumentID) },
                        { $set: {
                            'documents.$.DocType': DocType,
                            'documents.$.UploadDate': UploadDate ? new Date(UploadDate) : null,
                            'documents.$.VerficationStatus': VerficationStatus,
                            'documents.$.Path': Path,
                        } }
                    )
                );
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + DocumentID + "] is Updated Successfully" });
                console.log("Record Id [" + DocumentID + "] is Updated Successfully");
            }
        );
    });
};