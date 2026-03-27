import db from '../../Database/connection.js';

export const createCompanyEmployee = (req, res) => {
    console.log("Post Request Received");
    db.query("SELECT EmployeeID FROM companyemployee WHERE Email = ?", [req.body.Email], function (err, emailResult) {
        if (err) throw err;
        if (emailResult.length > 0) {
            return res.status(409).json({
                "Status": "Error",
                "Message": "Email [" + req.body.Email + "] already exists. Please use a unique Email."
            });
        }
        db.query("SELECT EmployeeID FROM companyemployee WHERE Phone = ?", [req.body.Phone], function (err, phoneResult) {
            if (err) throw err;
            if (phoneResult.length > 0) {
                return res.status(409).json({
                    "Status": "Error",
                    "Message": "Phone [" + req.body.Phone + "] already exists. Please use a unique Phone Number."
                });
            }
            db.query(
                "INSERT INTO companyemployee (`Email`,`FirstName`,`LastName`,`Phone`,`CompanyID`) VALUES (?,?,?,?,?)",
                [req.body.Email, req.body.FirstName, req.body.LastName, req.body.Phone, req.body.CompanyID],
                function (err, result) {
                    if (err) throw err;
                    res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
                    console.log("Record Added " + result.insertId);
                }
            );
        });
    });
};

export const getCompanyEmployee = (req, res) => {
    const EmployeeID = req.query.EmployeeID;
    if (EmployeeID == '%') {
        db.query("SELECT * FROM companyemployee where EmployeeID LIKE ?", [EmployeeID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM companyemployee where EmployeeID = ?", [EmployeeID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteCompanyEmployee = (req, res) => {
    const EmployeeID = req.query.EmployeeID;

    db.query("SELECT EmployeeID FROM companyemployee WHERE EmployeeID = ?", [EmployeeID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + EmployeeID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM companyemployee WHERE EmployeeID = ?", [EmployeeID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + EmployeeID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + EmployeeID + "] received");
        });
    });
};

export const updateCompanyEmployee = (req, res) => {
    console.log("PUT Request Received");
    const EmployeeID = req.query.EmployeeID;

    db.query("SELECT * FROM companyemployee WHERE EmployeeID = ?", [EmployeeID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + EmployeeID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing  = result[0];
        const Email     = req.body.Email     !== undefined ? req.body.Email     : existing.Email;
        const FirstName = req.body.FirstName !== undefined ? req.body.FirstName : existing.FirstName;
        const LastName  = req.body.LastName  !== undefined ? req.body.LastName  : existing.LastName;
        const Phone     = req.body.Phone     !== undefined ? req.body.Phone     : existing.Phone;
        const CompanyID = req.body.CompanyID !== undefined ? req.body.CompanyID : existing.CompanyID;

        db.query(
            "UPDATE companyemployee SET `Email` = ?, `FirstName` = ?, `LastName` = ?, `Phone` = ?, `CompanyID` = ? WHERE EmployeeID = ?",
            [Email, FirstName, LastName, Phone, CompanyID, EmployeeID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + EmployeeID + "] is Updated Successfully" });
                console.log("Record Id [" + EmployeeID + "] is Updated Successfully");
            }
        );
    });
};