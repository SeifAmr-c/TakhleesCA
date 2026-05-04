import db from '../../Database/connection.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sanitizeCompany = (row) => {
  if (!row) return null;
  const { Password, ...rest } = row;
  return rest;
};

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

export const createCompany = async (req, res, next) => {
    try {
        const Name = String(req.body.Name ?? "").trim();
        const ContactEmail = normalizeEmail(req.body.ContactEmail);
        const FoundingDate = req.body.FoundingDate;
        const Password = String(req.body.Password ?? "");
        const Comm = req.body.Comm;
        const RegistrationDate = req.body.RegistrationDate;
        const TaxNumber = req.body.TaxNumber;
        const VerficationStatus = req.body.VerficationStatus ?? "Pending";

        if (!Name) return res.status(400).json({ ok: false, message: "Name is required." });
        if (!isValidEmail(ContactEmail)) return res.status(400).json({ ok: false, message: "Valid contact email is required." });
        if (!Password || Password.length < 8) return res.status(400).json({ ok: false, message: "Password must be at least 8 characters long." });

        const existingEmail = await runQuery(
            "SELECT CompanyID FROM company WHERE ContactEmail = ? LIMIT 1",
            [ContactEmail]
        );
        if (existingEmail.length > 0) {
            return res.status(409).json({
                Status: "Error",
                Message: `Contact Email [${ContactEmail}] already exists. Please use a unique Contact Email.`,
            });
        }

        const existingTax = await runQuery(
            "SELECT CompanyID FROM company WHERE TaxNumber = ? LIMIT 1",
            [TaxNumber]
        );
        if (existingTax.length > 0) {
            return res.status(409).json({
                Status: "Error",
                Message: `Tax Number [${TaxNumber}] already exists. Please use a unique Tax Number.`,
            });
        }

        const hashedPassword = await bcrypt.hash(Password, SALT_ROUNDS);

        const result = await runQuery(
            "INSERT INTO company (`Name`,`ContactEmail`,`FoundingDate`,`Password`,`Comm`,`RegistrationDate`,`TaxNumber`,`VerficationStatus`) VALUES (?,?,?,?,?,?,?,?)",
            [Name, ContactEmail, FoundingDate, hashedPassword, Comm, RegistrationDate, TaxNumber, VerficationStatus]
        );

        return res.status(201).json({
            Status: "OK",
            Message: `Record Added Successfully with Id ${result.insertId}`,
        });
    } catch (err) {
        return next(err);
    }
};

export const loginCompany = async (req, res, next) => {
    try {
        const ContactEmail = normalizeEmail(req.body.ContactEmail);
        const Password = String(req.body.Password ?? "");

        if (!ContactEmail || !ContactEmail.includes("@")) {
            return res.status(400).json({ ok: false, message: "Valid contact email is required." });
        }
        if (!Password) {
            return res.status(400).json({ ok: false, message: "Password is required." });
        }

        const rows = await runQuery(
            "SELECT * FROM company WHERE ContactEmail = ? LIMIT 1",
            [ContactEmail]
        );
        if (!rows.length) {
            return res.status(401).json({ ok: false, message: "Invalid email or password." });
        }

        const companyRow = rows[0];

        const isMatch = await bcrypt.compare(Password, companyRow.Password);
        if (!isMatch) {
            return res.status(401).json({ ok: false, message: "Invalid email or password." });
        }

        req.session.companyId = companyRow.CompanyID;
        req.session.role = "company";

        return res.status(200).json({
            ok: true,
            message: "Logged in successfully.",
            data: { company: sanitizeCompany(companyRow) },
        });
    } catch (err) {
        return next(err);
    }
};

export const logoutCompany = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ ok: false, message: "Logout failed." });
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({ ok: true, message: "Logged out successfully." });
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
