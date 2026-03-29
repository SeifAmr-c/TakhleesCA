import db from '../../Database/connection.js';

export const createPayment = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO payment (`PaymentDate`,`Amount`,`PaymentGateway`,`ApplicationID`) VALUES (?,?,?,?)",
        [req.body.PaymentDate, req.body.Amount, req.body.PaymentGateway, req.body.ApplicationID], function (err, result) {
            if (err) throw err;
            res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added " + result.insertId);
        });
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

// ── searchPayment ────────────────────────────────────────
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