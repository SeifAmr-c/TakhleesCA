import db from '../../Database/connection.js';

export const createPayment = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO payment (`PaymentDate`,`Amount`,`PaymentGateway`,`ApplicationID`) VALUES (?,?,?,?)",
        [req.body.PaymentDate, req.body.Amount, req.body.PaymentGateway, req.body.ApplicationID], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added" + result.insertId);
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
    db.query("DELETE FROM payment where PaymentID = ?", [PaymentID], function (err, result) {
        if (err) throw err;
        res.json({ "Status": "OK", "Message": "Record Id [" + PaymentID + "] deleted Successfully" });
        console.log("Delete Request Received for record [" + PaymentID + "] received");
    });
};

export const updatePayment = (req, res) => {
    console.log("PUT Request Received");
    const PaymentID = req.query.PaymentID;
    db.query("UPDATE payment SET `Amount`= ? WHERE PaymentID = " + PaymentID,
        [req.body.Amount], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Id [" + PaymentID + "] is Updated Successfully" });
            console.log("Record Id [" + PaymentID + "] is Updated Successfully");
        });
};