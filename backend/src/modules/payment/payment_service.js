import db from '../../Database/connection.js';

const runQuery = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });

const PAYMENT_GATEWAYS = ['Credit Card', 'Bank Transfer'];

export const createPayment = async (req, res, next) => {
    try {
        /* Frontend has historically sent the gateway under either `Method` or
           `PaymentGateway`; accept both so we don't break the existing form. */
        const Gateway = req.body.PaymentGateway ?? req.body.Method;
        const Amount = Number(req.body.Amount);
        const ApplicationID = Number(req.body.ApplicationID);

        if (!ApplicationID) {
            return res.status(400).json({ ok: false, message: 'ApplicationID is required.' });
        }
        if (isNaN(Amount) || Amount <= 0) {
            return res.status(400).json({ ok: false, message: 'Amount must be a positive number.' });
        }
        if (!PAYMENT_GATEWAYS.includes(Gateway)) {
            return res.status(400).json({
                ok: false,
                message: `PaymentGateway must be one of: ${PAYMENT_GATEWAYS.join(', ')}.`,
            });
        }

        /* Make sure the application actually exists — otherwise the FK insert
           would fail with a less helpful error mid-transaction. */
        const exists = await runQuery(
            'SELECT 1 FROM application WHERE ApplicationID = ? LIMIT 1',
            [ApplicationID]
        );
        if (!exists.length) {
            return res.status(404).json({ ok: false, message: `Application ${ApplicationID} not found.` });
        }

        /* PaymentDate is NOT NULL in the schema. The form doesn't send one,
           so we stamp it server-side. The matching CompanyPayment row isn't
           booked here — it's deferred to the moment the company accepts the
           application (Pending → In Progress) so rejected/cancelled requests
           don't leave orphan revenue rows we'd later have to delete. */
        const result = await runQuery(
            'INSERT INTO payment (PaymentDate, Amount, PaymentGateway, ApplicationID) VALUES (NOW(), ?, ?, ?)',
            [Amount, Gateway, ApplicationID]
        );

        return res.status(201).json({
            ok: true,
            message: 'Payment recorded.',
            data: { PaymentID: result.insertId, Amount, PaymentGateway: Gateway, ApplicationID },
        });
    } catch (err) {
        return next(err);
    }
};

export const getPayment = (req, res) => {
    const PaymentID = req.query.PaymentID;
    if (PaymentID == '%') {
        db.query("SELECT * FROM payment where PaymentID LIKE ?", [PaymentID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM payment where PaymentID = ?", [PaymentID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deletePayment = (req, res) => {
    const PaymentID = req.query.PaymentID;

    db.query("SELECT PaymentID FROM payment WHERE PaymentID = ?", [PaymentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + PaymentID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM payment WHERE PaymentID = ?", [PaymentID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + PaymentID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + PaymentID + "] received");
        });
    });
};

export const searchPayment = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['PaymentID', 'PaymentDate', 'Amount', 'PaymentGateway', 'ApplicationID'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM payment WHERE ${keyword} = ? ORDER BY PaymentID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};

export const updatePayment = (req, res) => {
    console.log("PUT Request Received");
    const PaymentID = req.query.PaymentID;

    db.query("SELECT * FROM payment WHERE PaymentID = ?", [PaymentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + PaymentID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing       = result[0];
        const PaymentDate    = req.body.PaymentDate    !== undefined ? req.body.PaymentDate    : existing.PaymentDate;
        const Amount         = req.body.Amount         !== undefined ? req.body.Amount         : existing.Amount;
        const PaymentGateway = req.body.PaymentGateway !== undefined ? req.body.PaymentGateway : existing.PaymentGateway;
        const ApplicationID  = req.body.ApplicationID  !== undefined ? req.body.ApplicationID  : existing.ApplicationID;

        db.query(
            "UPDATE payment SET `PaymentDate` = ?, `Amount` = ?, `PaymentGateway` = ?, `ApplicationID` = ? WHERE PaymentID = ?",
            [PaymentDate, Amount, PaymentGateway, ApplicationID, PaymentID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + PaymentID + "] is Updated Successfully" });
                console.log("Record Id [" + PaymentID + "] is Updated Successfully");
            }
        );
    });
};