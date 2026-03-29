import db from '../../Database/connection.js';

export const createCompanyPayment = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO companypayment (`PaymentDate`,`Amount`,`CompanyID`,`PaymentID`) VALUES (?,?,?,?)",
        [req.body.PaymentDate, req.body.Amount, req.body.CompanyID, req.body.PaymentID], function (err, result) {
            if (err) throw err;
            res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added " + result.insertId);
        });
};

export const getCompanyPayment = (req, res) => {
    const CompanyPaymentID = req.query.CompanyPaymentID;
    if (CompanyPaymentID == '%') {
        db.query("SELECT * FROM companypayment where CompanyPaymentID LIKE ?", [CompanyPaymentID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM companypayment where CompanyPaymentID = ?", [CompanyPaymentID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteCompanyPayment = (req, res) => {
    const CompanyPaymentID = req.query.CompanyPaymentID;

    db.query("SELECT CompanyPaymentID FROM companypayment WHERE CompanyPaymentID = ?", [CompanyPaymentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + CompanyPaymentID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM companypayment WHERE CompanyPaymentID = ?", [CompanyPaymentID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CompanyPaymentID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + CompanyPaymentID + "] received");
        });
    });
};

// ── searchCompanyPayment ─────────────────────────────────
export const searchCompanyPayment = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['CompanyPaymentID', 'PaymentDate', 'Amount', 'CompanyID', 'PaymentID'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM companypayment WHERE ${keyword} = ? ORDER BY CompanyPaymentID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};

export const updateCompanyPayment = (req, res) => {
    console.log("PUT Request Received");
    const CompanyPaymentID = req.query.CompanyPaymentID;

    db.query("SELECT * FROM companypayment WHERE CompanyPaymentID = ?", [CompanyPaymentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + CompanyPaymentID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing    = result[0];
        const PaymentDate = req.body.PaymentDate !== undefined ? req.body.PaymentDate : existing.PaymentDate;
        const Amount      = req.body.Amount      !== undefined ? req.body.Amount      : existing.Amount;
        const CompanyID   = req.body.CompanyID   !== undefined ? req.body.CompanyID   : existing.CompanyID;
        const PaymentID   = req.body.PaymentID   !== undefined ? req.body.PaymentID   : existing.PaymentID;

        db.query(
            "UPDATE companypayment SET `PaymentDate` = ?, `Amount` = ?, `CompanyID` = ?, `PaymentID` = ? WHERE CompanyPaymentID = ?",
            [PaymentDate, Amount, CompanyID, PaymentID, CompanyPaymentID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CompanyPaymentID + "] is Updated Successfully" });
                console.log("Record Id [" + CompanyPaymentID + "] is Updated Successfully");
            }
        );
    });
};