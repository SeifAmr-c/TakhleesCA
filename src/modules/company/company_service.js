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
        const ComReg = req.body.ComReg ?? null;
        const Governorate = req.body.Governorate ?? null;
        const Address = req.body.Address ?? null;
        const About = req.body.About ?? null;

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
            "INSERT INTO company (`Name`,`ContactEmail`,`FoundingDate`,`Password`,`Comm`,`RegistrationDate`,`TaxNumber`,`VerficationStatus`,`ComReg`,`Governorate`,`Address`,`About`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [Name, ContactEmail, FoundingDate, hashedPassword, Comm, RegistrationDate, TaxNumber, VerficationStatus, ComReg, Governorate, Address, About]
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

export const getCompany = async (req, res, next) => {
    const CompanyID = req.query.CompanyID;
    const VerficationStatus = req.query.VerficationStatus;

    const cols = "CompanyID, Name, ContactEmail, FoundingDate, Comm, RegistrationDate, TaxNumber, VerficationStatus, ComReg, Governorate, Address, About";

    if (CompanyID !== undefined && CompanyID !== '' && CompanyID !== '%') {
        try {
            const companies = await runQuery(
                `SELECT ${cols} FROM company WHERE CompanyID = ?`,
                [CompanyID]
            );

            if (!companies.length) {
                return res.json(companies);
            }

            const reviews = await runQuery(
                `SELECT r.ReviewID, r.Review, r.Rating, r.ApplicationID, r.CategoryID,
                        u.FirstName, u.LastName
                   FROM Review r
                   JOIN Application a ON r.ApplicationID = a.ApplicationID
                   JOIN User u        ON a.ClientID      = u.UserID
                  WHERE a.CompanyID = ?
                  ORDER BY r.ReviewID DESC`,
                [CompanyID]
            );

            const ReviewCount = reviews.length;
            const AverageRating = ReviewCount
                ? Number((reviews.reduce((s, r) => s + Number(r.Rating || 0), 0) / ReviewCount).toFixed(2))
                : null;

            const row = { ...companies[0], Reviews: reviews, AverageRating, ReviewCount };
            return res.json([row]);
        } catch (err) {
            return next(err);
        }
    }

    const params = [];
    let where = "";
    if (VerficationStatus && ['Pending', 'Verified', 'Rejected'].includes(VerficationStatus)) {
        where = " WHERE VerficationStatus = ?";
        params.push(VerficationStatus);
    }

    db.query(`SELECT ${cols} FROM company${where} ORDER BY CompanyID DESC`, params, (err, result) => {
        if (err) return next(err);
        res.json(result);
    });
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

/* PUT /company/profile  (requires company session)
   Body: { Governorate?, Address?, ContactEmail?, About? }
   Updates only the fields that are present; other columns are preserved.
   Enforces ContactEmail uniqueness across companies. */
export const updateCompanyProfile = async (req, res, next) => {
    try {
        const CompanyID = req.session.companyId;
        const rows = await runQuery(
            "SELECT * FROM company WHERE CompanyID = ? LIMIT 1",
            [CompanyID]
        );
        if (!rows.length) {
            return res.status(404).json({ ok: false, message: "Company not found." });
        }
        const existing = rows[0];

        const incomingEmail = req.body.ContactEmail !== undefined ? normalizeEmail(req.body.ContactEmail) : null;
        if (incomingEmail !== null) {
            if (!isValidEmail(incomingEmail)) {
                return res.status(400).json({ ok: false, message: "Valid contact email is required." });
            }
            if (incomingEmail !== existing.ContactEmail) {
                const dupes = await runQuery(
                    "SELECT CompanyID FROM company WHERE ContactEmail = ? AND CompanyID <> ? LIMIT 1",
                    [incomingEmail, CompanyID]
                );
                if (dupes.length) {
                    return res.status(409).json({ ok: false, message: "Another company already uses that email." });
                }
            }
        }

        const Governorate  = req.body.Governorate  !== undefined ? String(req.body.Governorate).trim()  : existing.Governorate;
        const Address      = req.body.Address      !== undefined ? String(req.body.Address).trim()      : existing.Address;
        const ContactEmail = incomingEmail !== null ? incomingEmail : existing.ContactEmail;
        const About        = req.body.About        !== undefined ? String(req.body.About).trim()        : existing.About;

        await runQuery(
            "UPDATE company SET `Governorate` = ?, `Address` = ?, `ContactEmail` = ?, `About` = ? WHERE CompanyID = ?",
            [Governorate, Address, ContactEmail, About, CompanyID]
        );

        const updated = await runQuery(
            "SELECT CompanyID, Name, ContactEmail, FoundingDate, Comm, RegistrationDate, TaxNumber, VerficationStatus, ComReg, Governorate, Address, About FROM company WHERE CompanyID = ?",
            [CompanyID]
        );

        return res.status(200).json({
            ok: true,
            message: "Profile updated.",
            data: { company: updated[0] },
        });
    } catch (err) {
        return next(err);
    }
};

/* PUT /company/pricing  (requires company session)
   Body: { prices: [{ CategoryID, Price }, ...] }
   Bulk upsert into CompanyCategory using INSERT ... ON DUPLICATE KEY UPDATE.
   Validates that each CategoryID actually exists and that Price > 0. */
export const updateCompanyPricing = async (req, res, next) => {
    try {
        const CompanyID = req.session.companyId;
        const incoming = Array.isArray(req.body.prices) ? req.body.prices : null;
        if (!incoming || incoming.length === 0) {
            return res.status(400).json({ ok: false, message: "Body must contain a non-empty `prices` array." });
        }

        const cleaned = [];
        for (const row of incoming) {
            const CategoryID = Number(row?.CategoryID);
            const Price      = Number(row?.Price);
            if (!CategoryID || isNaN(Price) || Price <= 0) {
                return res.status(400).json({
                    ok: false,
                    message: `Invalid pricing entry: ${JSON.stringify(row)}.`,
                });
            }
            cleaned.push({ CategoryID, Price });
        }

        const existingCats = await runQuery("SELECT CategoryID FROM category");
        const validIds = new Set(existingCats.map((r) => r.CategoryID));
        for (const r of cleaned) {
            if (!validIds.has(r.CategoryID)) {
                return res.status(400).json({
                    ok: false,
                    message: `CategoryID ${r.CategoryID} does not exist.`,
                });
            }
        }

        for (const r of cleaned) {
            await runQuery(
                `INSERT INTO companycategory (CompanyID, CategoryID, Price)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE Price = VALUES(Price)`,
                [CompanyID, r.CategoryID, r.Price]
            );
        }

        const updated = await runQuery(
            "SELECT CompanyID, CategoryID, Price FROM companycategory WHERE CompanyID = ?",
            [CompanyID]
        );

        return res.status(200).json({
            ok: true,
            message: `Saved pricing for ${cleaned.length} categor${cleaned.length === 1 ? "y" : "ies"}.`,
            data: { prices: updated },
        });
    } catch (err) {
        return next(err);
    }
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
        const ComReg            = req.body.ComReg            !== undefined ? req.body.ComReg            : existing.ComReg;
        const Governorate       = req.body.Governorate       !== undefined ? req.body.Governorate       : existing.Governorate;
        const Address           = req.body.Address           !== undefined ? req.body.Address           : existing.Address;
        const About             = req.body.About             !== undefined ? req.body.About             : existing.About;

        db.query(
            "UPDATE company SET `Name` = ?, `ContactEmail` = ?, `FoundingDate` = ?, `Password` = ?, `Comm` = ?, `RegistrationDate` = ?, `TaxNumber` = ?, `VerficationStatus` = ?, `ComReg` = ?, `Governorate` = ?, `Address` = ?, `About` = ? WHERE CompanyID = ?",
            [Name, ContactEmail, FoundingDate, Password, Comm, RegistrationDate, TaxNumber, VerficationStatus, ComReg, Governorate, Address, About, CompanyID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CompanyID + "] is Updated Successfully" });
                console.log("Record Id [" + CompanyID + "] is Updated Successfully");
            }
        );
    });
};
