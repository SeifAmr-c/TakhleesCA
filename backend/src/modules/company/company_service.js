import db from '../../Database/connection.js';
import bcrypt from 'bcrypt';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadToCloudinary, destroyCloudinaryAsset } from '../../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../../../frontend/src/assets/logo.png');

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
        let ComReg = req.body.ComReg ?? null;
        let LogoUrl = req.body.LogoUrl ?? null;
        const comRegFile = req.files?.ComReg?.[0];
        const logoFile = req.files?.logo?.[0];
        if (comRegFile) {
            const uploaded = await uploadToCloudinary(comRegFile.buffer, "takhlees/compreg");
            ComReg = uploaded.secure_url;
        }
        if (logoFile?.buffer) {
            const uploaded = await uploadToCloudinary(logoFile.buffer, "takhlees/logos");
            LogoUrl = uploaded.secure_url;
        }
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
            "INSERT INTO company (`Name`,`ContactEmail`,`FoundingDate`,`Password`,`Comm`,`RegistrationDate`,`TaxNumber`,`VerficationStatus`,`ComReg`,`Governorate`,`Address`,`About`,`LogoUrl`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [Name, ContactEmail, FoundingDate, hashedPassword, Comm, RegistrationDate, TaxNumber, VerficationStatus, ComReg, Governorate, Address, About, LogoUrl]
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

        /* Regenerate the session ID on login (prevents session fixation
           and gives express-mysql-session a clean row to INSERT into). */
        await new Promise((resolve, reject) => {
            req.session.regenerate((err) => (err ? reject(err) : resolve()));
        });

        req.session.companyId = companyRow.CompanyID;
        req.session.role = "company";

        /* CRITICAL: express-mysql-session writes asynchronously. Without
           an explicit save() the response (and Set-Cookie) can be flushed
           to the client BEFORE the sessions row is committed, so the next
           request looks up a session that does not yet exist and
           express-session silently spawns a fresh empty one. */
        await new Promise((resolve, reject) => {
            req.session.save((err) => (err ? reject(err) : resolve()));
        });

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

    const cols = "CompanyID, Name, ContactEmail, FoundingDate, Comm, RegistrationDate, TaxNumber, VerficationStatus, ComReg, Governorate, Address, About, LogoUrl";

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

        /* If multer parsed a `logo` upload, stream it to Cloudinary and
           use the secure URL going forward. Otherwise keep the existing
           URL — partial PUTs must NOT null out an unchanged logo. We
           read from req.files.logo[0] to match the createCompany flow,
           since both routes register `logo` via multer.fields(). */
        const logoFile = req.files?.logo?.[0];
        let LogoUrl = existing.LogoUrl;
        if (logoFile?.buffer) {
            const uploaded = await uploadToCloudinary(logoFile.buffer, "takhlees/logos");
            LogoUrl = uploaded.secure_url;
            /* Garbage-collect the previous logo on Cloudinary so we
               don't accumulate orphaned uploads. We only attempt this
               AFTER the new upload succeeds (so a failure here doesn't
               lose the old asset before we have a replacement), and
               destroyCloudinaryAsset itself swallows errors so a stale
               public_id never blocks the profile update. */
            if (existing.LogoUrl) {
                await destroyCloudinaryAsset(existing.LogoUrl);
            }
        }

        await runQuery(
            "UPDATE company SET `Governorate` = ?, `Address` = ?, `ContactEmail` = ?, `About` = ?, `LogoUrl` = ? WHERE CompanyID = ?",
            [Governorate, Address, ContactEmail, About, LogoUrl, CompanyID]
        );

        const updated = await runQuery(
            "SELECT CompanyID, Name, ContactEmail, FoundingDate, Comm, RegistrationDate, TaxNumber, VerficationStatus, ComReg, Governorate, Address, About, LogoUrl FROM company WHERE CompanyID = ?",
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

/* GET /company/dashboard-stats  (requires company session)
   Returns aggregate KPIs for the signed-in company's dashboard. Net earnings
   subtract a flat platform fee AND the company's specific Comm percentage,
   both pulled from the Company row. Comm is stored as DECIMAL(4,2) and
   interpreted as a percentage of completed revenue (e.g. 8.50 -> 8.5%). */
const PLATFORM_FEE = 1600;

export const getCompanyDashboardStats = async (req, res, next) => {
    try {
        const companyId = req.session?.companyId;
        console.log("Fetching stats for CompanyID:", companyId);
        if (!companyId) {
            return res.status(401).json({ ok: false, message: "Company sign-in required." });
        }

        const companyRows = await runQuery(
            "SELECT CompanyID, Comm FROM company WHERE CompanyID = ? LIMIT 1",
            [companyId]
        );
        console.log("Raw Company Row:", companyRows);
        if (!companyRows.length) {
            return res.status(404).json({ ok: false, message: "Company not found." });
        }
        const CompPercentageRaw = companyRows[0].Comm;
        const CommPercentage = Number(CompPercentageRaw) || 0;

        const revenueRows = await runQuery(
            `SELECT COALESCE(SUM(p.Amount), 0) AS CompletedRevenue
               FROM payment p
               JOIN application a ON p.ApplicationID = a.ApplicationID
              WHERE a.CompanyID = ? AND a.Status = 'Completed'`,
            [companyId]
        );
        console.log("Raw SQL Result:", revenueRows);

        /* mysql2 returns DECIMAL columns as JS strings (e.g. "20000.00").
           Always coerce with Number() before doing arithmetic. */
        const Revenue = Number(revenueRows[0]?.CompletedRevenue ?? 0);
        const CommissionAmount = (Revenue * CommPercentage) / 100;
        const PlatformFee = 1600;
        const NetEarnings = Math.max(0, Revenue - (PlatformFee + CommissionAmount));
        console.log("Computed:", { Revenue, CommPercentage, CommissionAmount, PlatformFee, NetEarnings });

        return res.status(200).json({
            ok: true,
            data: {
                CompanyID: companyId,
                CompletedRevenue: Revenue,
                Comm: CommPercentage,
                CommissionAmount,
                PlatformFee,
                NetEarnings,
            },
        });
    } catch (err) {
        return next(err);
    }
};

/* GET /company/export-report  (requires company session)
   Aggregates the signed-in company's KPIs, increments PdfExportCount,
   then streams a Company Performance Report PDF to the response. */
export const generatePerformanceReport = async (req, res, next) => {
    try {
        const companyId = req.session?.companyId;
        if (!companyId) {
            return res.status(401).json({ ok: false, message: "Company sign-in required." });
        }

        const companyRows = await runQuery(
            "SELECT CompanyID, Name, Comm FROM company WHERE CompanyID = ? LIMIT 1",
            [companyId]
        );
        if (!companyRows.length) {
            return res.status(404).json({ ok: false, message: "Company not found." });
        }
        const company = companyRows[0];
        const CommPercentage = Number(company.Comm) || 0;

        const revenueRows = await runQuery(
            `SELECT COALESCE(SUM(p.Amount), 0) AS TotalRevenue
               FROM payment p
               JOIN application a ON p.ApplicationID = a.ApplicationID
              WHERE a.CompanyID = ? AND a.Status = 'Completed'`,
            [companyId]
        );
        const TotalRevenue = Number(revenueRows[0]?.TotalRevenue ?? 0);
        const CommissionAmount = (TotalRevenue * CommPercentage) / 100;
        const NetRevenue = Math.max(0, TotalRevenue - PLATFORM_FEE - CommissionAmount);

        const statusRows = await runQuery(
            `SELECT
                SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) AS Completed,
                SUM(CASE WHEN Status = 'Pending'   THEN 1 ELSE 0 END) AS Pending,
                SUM(CASE WHEN Status = 'In Progress' THEN 1 ELSE 0 END) AS InProgress
               FROM application WHERE CompanyID = ?`,
            [companyId]
        );
        const CompletedCount  = Number(statusRows[0]?.Completed ?? 0);
        const PendingCount    = Number(statusRows[0]?.Pending ?? 0);
        const InProgressCount = Number(statusRows[0]?.InProgress ?? 0);

        const topCategories = await runQuery(
            `SELECT c.Type AS CategoryName,
                    COUNT(*) AS AppCount,
                    COALESCE(SUM(p.Amount), 0) AS Revenue
               FROM application a
               JOIN category c    ON a.CategoryID    = c.CategoryID
               LEFT JOIN payment p ON p.ApplicationID = a.ApplicationID
              WHERE a.CompanyID = ?
              GROUP BY c.CategoryID, c.Type
              ORDER BY Revenue DESC, AppCount DESC
              LIMIT 5`,
            [companyId]
        );

        const reviews = await runQuery(
            `SELECT r.ReviewID, r.Review, r.Rating, u.FirstName, u.LastName
               FROM review r
               JOIN application a ON r.ApplicationID = a.ApplicationID
               JOIN user u        ON a.ClientID      = u.UserID
              WHERE a.CompanyID = ?
              ORDER BY r.ReviewID DESC
              LIMIT 5`,
            [companyId]
        );

        await runQuery(
            "UPDATE company SET PdfExportCount = PdfExportCount + 1 WHERE CompanyID = ?",
            [companyId]
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="Company_Performance_Report.pdf"'
        );

        const doc = new PDFDocument({ size: "A4", margin: 50 });

        // Page border — drawn first so all content sits inside it.
        doc
            .lineWidth(1)
            .strokeColor("#000000")
            .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
            .stroke();

        doc.pipe(res);

        const LEFT = doc.page.margins.left;
        const PAGE_WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        const hr = (gap = 8) => {
            doc.moveDown(0.4);
            const y = doc.y + gap;
            doc
                .strokeColor("#000000")
                .lineWidth(0.5)
                .moveTo(LEFT, y)
                .lineTo(LEFT + PAGE_WIDTH, y)
                .stroke();
            doc.moveDown(0.6);
        };

        const sectionTitle = (label) => {
            doc.moveDown(1);
            doc
                .font("Helvetica-Bold")
                .fontSize(12)
                .fillColor("#000000")
                .text(label.toUpperCase(), LEFT, doc.y, {
                    width: PAGE_WIDTH,
                    align: "center",
                    characterSpacing: 1.5,
                });
            doc.moveDown(0.4);
        };

        const row = (label, value) => {
            const y = doc.y;
            doc.font("Helvetica").fontSize(10).fillColor("#000000").text(label, LEFT, y);
            doc.font("Helvetica-Bold").fillColor("#000000").text(value, LEFT, y, {
                width: PAGE_WIDTH,
                align: "right",
            });
            doc.moveDown(0.3);
        };

        const fmtMoney = (n) =>
            "EGP " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Section 1 — Centered logo + Takhlees header
        const LOGO_WIDTH = 100;
        if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, (doc.page.width - LOGO_WIDTH) / 2, doc.y, { width: LOGO_WIDTH });
            doc.y += LOGO_WIDTH + 8;
        }
        doc
            .font("Helvetica-Bold")
            .fontSize(28)
            .fillColor("#000000")
            .text("Takhlees", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
        doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#000000")
            .text("Customs clearance, simplified.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
        hr(4);

        // Section 2 — Report title (centered, with extra breathing room)
        doc.moveDown(2);
        doc
            .font("Helvetica-Bold")
            .fontSize(18)
            .fillColor("#000000")
            .text(`${company.Name} Performance Report`, LEFT, doc.y, {
                width: PAGE_WIDTH,
                align: "center",
            });
        doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#000000")
            .text(`Generated ${new Date().toISOString().slice(0, 10)}`, LEFT, doc.y, {
                width: PAGE_WIDTH,
                align: "center",
            });

        // Section 3 — Financials (left/right receipt rows)
        sectionTitle("Financials");
        row("Total Revenue", fmtMoney(TotalRevenue));
        row(`Commission (${CommPercentage}%)`, fmtMoney(CommissionAmount));
        row("Platform Fee", fmtMoney(PLATFORM_FEE));
        row("Net Revenue", fmtMoney(NetRevenue));

        // Section 4 — Applications status (left/right rows)
        sectionTitle("Applications Status");
        row("Completed", String(CompletedCount));
        row("In Progress", String(InProgressCount));
        row("Pending", String(PendingCount));

        // Section 5 — Top categories
        sectionTitle("Top Categories");
        if (!topCategories.length) {
            doc
                .font("Helvetica-Oblique")
                .fontSize(10)
                .fillColor("#000000")
                .text("No category activity yet.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
        } else {
            topCategories.forEach((c, i) => {
                const y = doc.y;
                doc
                    .font("Helvetica-Bold")
                    .fontSize(10)
                    .fillColor("#000000")
                    .text(`${i + 1}. ${c.CategoryName}`, LEFT, y);
                doc
                    .font("Helvetica")
                    .fillColor("#000000")
                    .text(
                        `${c.AppCount} application${c.AppCount === 1 ? "" : "s"} · ${fmtMoney(c.Revenue)}`,
                        LEFT,
                        y,
                        { width: PAGE_WIDTH, align: "right" }
                    );
                doc.moveDown(0.3);
            });
        }

        // Section 6 — Reviews
        sectionTitle("Latest Reviews");
        if (!reviews.length) {
            doc
                .font("Helvetica-Oblique")
                .fontSize(10)
                .fillColor("#000000")
                .text("No reviews yet.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
        } else {
            reviews.forEach((r) => {
                const stars = "★".repeat(Math.max(0, Math.min(5, Number(r.Rating) || 0)));
                const author = `${r.FirstName ?? ""} ${r.LastName ?? ""}`.trim() || "Anonymous";
                doc
                    .font("Helvetica-Bold")
                    .fontSize(10)
                    .fillColor("#000000")
                    .text(`${author} `, { continued: true });
                doc
                    .font("Helvetica")
                    .fillColor("#000000")
                    .text(`${stars}  (${r.Rating}/5)`);
                if (r.Review) {
                    doc.font("Helvetica").fontSize(10).fillColor("#000000").text(`"${r.Review}"`);
                }
                doc.moveDown(0.3);
            });
        }

        // Section 7 — Footer pinned safely above the bottom margin
        doc.fillColor("#888888").fontSize(10);
        doc
            .font("Helvetica-Bold")
            .text("Takhlees", 20, doc.page.height - 70, {
                align: "center",
                width: doc.page.width - 40,
                lineBreak: false,
            });

        doc.end();
    } catch (err) {
        if (!res.headersSent) {
            return next(err);
        }
        // Headers already flushed — destroy the response so the client sees a truncated download rather than a malformed PDF body.
        res.destroy(err);
    }
};

/* POST /company/recommend  (requires user session)
   Body: { governorate, category, minPrice, maxPrice }
   Matchmaker: returns Verified companies that serve the given governorate
   AND offer the given category at a price in [minPrice, maxPrice], ranked
   by fulfilled-count for that category and then by average rating. */
export const recommendCompanies = async (req, res, next) => {
    try {
        const governorate = typeof req.body.governorate === "string" ? req.body.governorate.trim() : "";
        const category    = typeof req.body.category    === "string" ? req.body.category.trim()    : "";
        const minPrice    = Number(req.body.minPrice);
        const maxPrice    = Number(req.body.maxPrice);

        if (!governorate) {
            return res.status(400).json({ ok: false, message: "governorate is required." });
        }
        if (!category) {
            return res.status(400).json({ ok: false, message: "category is required." });
        }
        if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice < 0 || maxPrice < 0) {
            return res.status(400).json({ ok: false, message: "minPrice and maxPrice must be non-negative numbers." });
        }
        if (minPrice > maxPrice) {
            return res.status(400).json({ ok: false, message: "minPrice cannot be greater than maxPrice." });
        }

        const rows = await runQuery(
            `SELECT c.CompanyID,
                    c.Name,
                    c.ContactEmail,
                    c.Governorate,
                    c.Address,
                    c.About,
                    c.LogoUrl,
                    c.VerficationStatus,
                    cat.CategoryID,
                    cat.Type AS CategoryType,
                    cc.Price AS CategoryPrice,
                    COALESCE(fa.FulfilledCount, 0) AS FulfilledCount,
                    ar.AverageRating
               FROM company c
               JOIN companycategory cc ON cc.CompanyID  = c.CompanyID
               JOIN category cat       ON cat.CategoryID = cc.CategoryID
               LEFT JOIN (
                   SELECT CompanyID, CategoryID, COUNT(*) AS FulfilledCount
                     FROM application
                    WHERE Status = 'Completed'
                    GROUP BY CompanyID, CategoryID
               ) fa ON fa.CompanyID = c.CompanyID AND fa.CategoryID = cc.CategoryID
               LEFT JOIN (
                   SELECT a.CompanyID, r.CategoryID, AVG(r.Rating) AS AverageRating
                     FROM review r
                     JOIN application a ON a.ApplicationID = r.ApplicationID
                    GROUP BY a.CompanyID, r.CategoryID
               ) ar ON ar.CompanyID = c.CompanyID AND ar.CategoryID = cc.CategoryID
              WHERE c.Governorate = ?
                AND cat.Type = ?
                AND cc.Price BETWEEN ? AND ?
                AND c.VerficationStatus = 'Verified'
              ORDER BY FulfilledCount DESC, AverageRating DESC, c.Name ASC`,
            [governorate, category, minPrice, maxPrice]
        );

        /* DECIMAL/AVG columns come back as strings from mysql2; normalize so
           the client gets numbers (or null for "no reviews yet"). */
        const data = rows.map((r) => ({
            ...r,
            CategoryPrice:  Number(r.CategoryPrice),
            FulfilledCount: Number(r.FulfilledCount),
            AverageRating:  r.AverageRating === null ? null : Number(Number(r.AverageRating).toFixed(2)),
        }));

        return res.status(200).json({ ok: true, data });
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
