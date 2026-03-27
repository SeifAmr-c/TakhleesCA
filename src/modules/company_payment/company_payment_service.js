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

export const updateCompanyPayment = (req, res) => {
    console.log("PUT Request Received");
    const CompanyPaymentID = req.query.CompanyPaymentID;

    db.query("SELECT CompanyPaymentID FROM companypayment WHERE CompanyPaymentID = ?", [CompanyPaymentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + CompanyPaymentID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        db.query("UPDATE companypayment SET `Amount` = ? WHERE CompanyPaymentID = ?",
            [req.body.Amount, CompanyPaymentID], function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CompanyPaymentID + "] is Updated Successfully" });
                console.log("Record Id [" + CompanyPaymentID + "] is Updated Successfully");
            });
    });
};