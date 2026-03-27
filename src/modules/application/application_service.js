import db from '../../Database/connection.js';

export const createApplication = (req, res) => {
    console.log("Post Request Received");
    db.query(
        "SELECT ApplicationID FROM application WHERE TrackingNumber = ?",
        [req.body.TrackingNumber],
        function (err, result) {
            if (err) throw err;
            if (result.length > 0) {
                return res.status(409).json({
                    "Status": "Error",
                    "Message": "Tracking Number [" + req.body.TrackingNumber + "] already exists. Please use a unique Tracking Number."
                });
            }
            db.query(
                "INSERT INTO application (`PaymentType`,`CompletionDate`,`SubmissionDate`,`TrackingNumber`,`Status`,`DeliveryAddress`,`CompanyEmployeeID`,`CategoryID`) VALUES (?,?,?,?,?,?,?,?)",
                [req.body.PaymentType, req.body.CompletionDate, req.body.SubmissionDate, req.body.TrackingNumber, req.body.Status, req.body.DeliveryAddress, req.body.CompanyEmployeeID, req.body.CategoryID],
                function (err, result) {
                    if (err) throw err;
                    res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
                    console.log("Record Added " + result.insertId);
                }
            );
        }
    );
};

export const getApplication = (req, res) => {
    const ApplicationID = req.query.ApplicationID;
    if (ApplicationID == '%') {
        db.query("SELECT * FROM application where ApplicationID LIKE ?", [ApplicationID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM application where ApplicationID = ?", [ApplicationID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
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

export const updateApplication = (req, res) => {
    console.log("PUT Request Received");
    const ApplicationID = req.query.ApplicationID;

    db.query("SELECT * FROM application WHERE ApplicationID = ?", [ApplicationID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + ApplicationID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing         = result[0];
        const PaymentType      = req.body.PaymentType      !== undefined ? req.body.PaymentType      : existing.PaymentType;
        const CompletionDate   = req.body.CompletionDate   !== undefined ? req.body.CompletionDate   : existing.CompletionDate;
        const SubmissionDate   = req.body.SubmissionDate   !== undefined ? req.body.SubmissionDate   : existing.SubmissionDate;
        const TrackingNumber   = req.body.TrackingNumber   !== undefined ? req.body.TrackingNumber   : existing.TrackingNumber;
        const Status           = req.body.Status           !== undefined ? req.body.Status           : existing.Status;
        const DeliveryAddress  = req.body.DeliveryAddress  !== undefined ? req.body.DeliveryAddress  : existing.DeliveryAddress;
        const CompanyEmployeeID = req.body.CompanyEmployeeID !== undefined ? req.body.CompanyEmployeeID : existing.CompanyEmployeeID;
        const CategoryID       = req.body.CategoryID       !== undefined ? req.body.CategoryID       : existing.CategoryID;

        db.query(
            "UPDATE application SET `PaymentType` = ?, `CompletionDate` = ?, `SubmissionDate` = ?, `TrackingNumber` = ?, `Status` = ?, `DeliveryAddress` = ?, `CompanyEmployeeID` = ?, `CategoryID` = ? WHERE ApplicationID = ?",
            [PaymentType, CompletionDate, SubmissionDate, TrackingNumber, Status, DeliveryAddress, CompanyEmployeeID, CategoryID, ApplicationID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + ApplicationID + "] is Updated Successfully" });
                console.log("Record Id [" + ApplicationID + "] is Updated Successfully");
            }
        );
    });
};