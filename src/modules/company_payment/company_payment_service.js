import db from '../../Database/connection.js';

export const createCompanyPayment = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO companypayment (`PaymentDate`,`Amount`,`CompanyID`,`PaymentID`) VALUES (?,?,?,?)",
        [req.body.PaymentDate, req.body.Amount, req.body.CompanyID, req.body.PaymentID], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added" + result.insertId);
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
    db.query("DELETE FROM companypayment where CompanyPaymentID = ?", [CompanyPaymentID], function (err, result) {
        if (err) throw err;
        res.json({ "Status": "OK", "Message": "Record Id [" + CompanyPaymentID + "] deleted Successfully" });
        console.log("Delete Request Received for record [" + CompanyPaymentID + "] received");
    });
};

export const updateCompanyPayment = (req, res) => {
    console.log("PUT Request Received");
    const CompanyPaymentID = req.query.CompanyPaymentID;
    db.query("UPDATE companypayment SET `Amount`= ? WHERE CompanyPaymentID = " + CompanyPaymentID,
        [req.body.Amount], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Id [" + CompanyPaymentID + "] is Updated Successfully" });
            console.log("Record Id [" + CompanyPaymentID + "] is Updated Successfully");
        });
};