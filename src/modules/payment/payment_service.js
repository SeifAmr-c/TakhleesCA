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

export const updatePayment = (req, res) => {
    console.log("PUT Request Received");
    const PaymentID = req.query.PaymentID;

    db.query("SELECT PaymentID FROM payment WHERE PaymentID = ?", [PaymentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + PaymentID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        db.query("UPDATE payment SET `Amount` = ? WHERE PaymentID = ?",
            [req.body.Amount, PaymentID], function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + PaymentID + "] is Updated Successfully" });
                console.log("Record Id [" + PaymentID + "] is Updated Successfully");
            });
    });
};