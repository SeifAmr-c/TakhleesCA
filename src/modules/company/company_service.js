import db from '../../Database/connection.js';

export const createCompany = (req, res) => {
    console.log("Post Request Received");
    db.query("SELECT CompanyID FROM company WHERE ContactEmail = ?", [req.body.ContactEmail], function (err, emailResult) {
        if (err) throw err;
        if (emailResult.length > 0) {
            return res.status(409).json({
                "Status": "Error",
                "Message": "Contact Email [" + req.body.ContactEmail + "] already exists. Please use a unique Contact Email."
            });
        }
        db.query("SELECT CompanyID FROM company WHERE TaxNumber = ?", [req.body.TaxNumber], function (err, taxResult) {
            if (err) throw err;
            if (taxResult.length > 0) {
                return res.status(409).json({
                    "Status": "Error",
                    "Message": "Tax Number [" + req.body.TaxNumber + "] already exists. Please use a unique Tax Number."
                });
            }
            db.query(
                "INSERT INTO company (`Name`,`ContactEmail`,`FoundingDate`,`Password`,`Comm`,`RegistrationDate`,`TaxNumber`,`VerficationStatus`) VALUES (?,?,?,?,?,?,?,?)",
                [req.body.Name, req.body.ContactEmail, req.body.FoundingDate, req.body.Password, req.body.Comm, req.body.RegistrationDate, req.body.TaxNumber, req.body.VerficationStatus],
                function (err, result) {
                    if (err) throw err;
                    res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
                    console.log("Record Added " + result.insertId);
                }
            );
        });
    });
};

export const getCompany = (req, res) => {
    const CompanyID = req.query.CompanyID;
    if (CompanyID == '%') {
        db.query("SELECT * FROM company where CompanyID LIKE ?", [CompanyID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM company where CompanyID = ?", [CompanyID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteCompany = (req, res) => {
    const CompanyID = req.query.CompanyID;

    db.query("SELECT CompanyID FROM company WHERE CompanyID = ?", [CompanyID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + CompanyID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM company WHERE CompanyID = ?", [CompanyID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CompanyID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + CompanyID + "] received");
        });
    });
};

export const searchCompany = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['CompanyID', 'Name', 'ContactEmail', 'TaxNumber', 'VerficationStatus'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM company WHERE ${keyword} = ? ORDER BY CompanyID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};

export const updateCompany = (req, res) => {
    console.log("PUT Request Received");
    const CompanyID = req.query.CompanyID;

    db.query("SELECT * FROM company WHERE CompanyID = ?", [CompanyID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + CompanyID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing          = result[0];
        const Name              = req.body.Name              !== undefined ? req.body.Name              : existing.Name;
        const ContactEmail      = req.body.ContactEmail      !== undefined ? req.body.ContactEmail      : existing.ContactEmail;
        const FoundingDate      = req.body.FoundingDate      !== undefined ? req.body.FoundingDate      : existing.FoundingDate;
        const Password          = req.body.Password          !== undefined ? req.body.Password          : existing.Password;
        const Comm              = req.body.Comm              !== undefined ? req.body.Comm              : existing.Comm;
        const RegistrationDate  = req.body.RegistrationDate  !== undefined ? req.body.RegistrationDate  : existing.RegistrationDate;
        const TaxNumber         = req.body.TaxNumber         !== undefined ? req.body.TaxNumber         : existing.TaxNumber;
        const VerficationStatus = req.body.VerficationStatus !== undefined ? req.body.VerficationStatus : existing.VerficationStatus;

        db.query(
            "UPDATE company SET `Name` = ?, `ContactEmail` = ?, `FoundingDate` = ?, `Password` = ?, `Comm` = ?, `RegistrationDate` = ?, `TaxNumber` = ?, `VerficationStatus` = ? WHERE CompanyID = ?",
            [Name, ContactEmail, FoundingDate, Password, Comm, RegistrationDate, TaxNumber, VerficationStatus, CompanyID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CompanyID + "] is Updated Successfully" });
                console.log("Record Id [" + CompanyID + "] is Updated Successfully");
            }
        );
    });
};