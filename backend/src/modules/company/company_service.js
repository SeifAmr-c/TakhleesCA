import bcrypt from 'bcrypt';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadToCloudinary, destroyCloudinaryAsset, companyFolder } from '../../config/cloudinary.js';
import Company from '../../Database/mongo/company.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';
import Review from '../../Database/mongo/review.mongo.js';
import CompanyPayment from '../../Database/mongo/company_payment.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../../../frontend/src/assets/logo.png');

const SALT_ROUNDS = 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sanitizeCompany = (doc) => {
  if (!doc) return null;
  const c = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const { Password, ...rest } = c;
  return rest;
};

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
      const uploaded = await uploadToCloudinary(comRegFile.buffer, companyFolder(Name, "compreg"));
      ComReg = uploaded.secure_url;
    }
    if (logoFile?.buffer) {
      const uploaded = await uploadToCloudinary(logoFile.buffer, companyFolder(Name, "logo"));
      LogoUrl = uploaded.secure_url;
    }
    const Governorate = req.body.Governorate ?? null;
    const Address = req.body.Address ?? null;
    const About = req.body.About ?? null;

    if (!Name) return res.status(400).json({ ok: false, message: "Name is required." });
    if (!isValidEmail(ContactEmail)) return res.status(400).json({ ok: false, message: "Valid contact email is required." });
    if (!Password || Password.length < 8) return res.status(400).json({ ok: false, message: "Password must be at least 8 characters long." });

    const dupEmail = await Company.findOne({ ContactEmail }).select({ _id: 1 });
    if (dupEmail) {
      return res.status(409).json({
        Status: "Error",
        Message: `Contact Email [${ContactEmail}] already exists. Please use a unique Contact Email.`,
      });
    }
    const dupTax = await Company.findOne({ TaxNumber: Number(TaxNumber) }).select({ _id: 1 });
    if (dupTax) {
      return res.status(409).json({
        Status: "Error",
        Message: `Tax Number [${TaxNumber}] already exists. Please use a unique Tax Number.`,
      });
    }

    const hashedPassword = await bcrypt.hash(Password, SALT_ROUNDS);
    const CompanyID = await nextId('company');

    await Company.create({
      CompanyID,
      Name,
      ContactEmail,
      FoundingDate,
      Password: hashedPassword,
      Comm: Number(Comm),
      RegistrationDate,
      TaxNumber: Number(TaxNumber),
      VerficationStatus,
      ComReg, Governorate, Address, About, LogoUrl,
    });

    return res.status(201).json({
      Status: "OK",
      Message: `Record Added Successfully with Id ${CompanyID}`,
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

    const company = await Company.findOne({ ContactEmail });
    if (!company) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(Password, company.Password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    /* Regenerate the session ID on login (prevents fixation). */
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.companyId = company.CompanyID;
    req.session.role = "company";

    /* Force-write the session before responding so the next request
       sees the row instead of starting a fresh empty session. */
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    return res.status(200).json({
      ok: true,
      message: "Logged in successfully.",
      data: { company: sanitizeCompany(company) },
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

const PUBLIC_COMPANY_FIELDS = {
  Password: 0,
  ports: 0,
  categories: 0,
  __v: 0,
};

export const getCompany = async (req, res, next) => {
  try {
    const { CompanyID, VerficationStatus } = req.query;

    if (CompanyID !== undefined && CompanyID !== '' && CompanyID !== '%') {
      const cid = Number(CompanyID);
      const company = await Company.findOne({ CompanyID: cid }, PUBLIC_COMPANY_FIELDS).lean();
      if (!company) return res.json([]);

      const reviews = await Review.find({ CompanyID: cid }).sort({ ReviewID: -1 }).lean();
      const ReviewCount = reviews.length;
      const AverageRating = ReviewCount
        ? Number((reviews.reduce((s, r) => s + Number(r.Rating || 0), 0) / ReviewCount).toFixed(2))
        : null;
      const Reviews = reviews.map((r) => ({
        ReviewID: r.ReviewID,
        Review: r.Review,
        Rating: r.Rating,
        ApplicationID: r.ApplicationID,
        CategoryID: r.CategoryID,
        FirstName: r.client?.FirstName ?? null,
        LastName: r.client?.LastName ?? null,
      }));
      return res.json([{ ...company, Reviews, AverageRating, ReviewCount }]);
    }

    const filter = {};
    if (VerficationStatus && ['Pending', 'Verified', 'Rejected'].includes(VerficationStatus)) {
      filter.VerficationStatus = VerficationStatus;
    }
    const companies = await Company.find(filter, PUBLIC_COMPANY_FIELDS).sort({ CompanyID: -1 }).lean();
    return res.json(companies);
  } catch (err) {
    return next(err);
  }
};

export const canDeleteCompany = async (req, res, next) => {
  try {
    const CompanyID = req.session.companyId;
    const count = await Application.countDocuments({
      CompanyID,
      Status: { $in: ['Pending', 'In Progress'] },
    });
    return res.json({ ok: true, hasActiveApplications: count > 0 });
  } catch (err) {
    return next(err);
  }
};

export const deleteCompanyProfile = async (req, res, next) => {
  try {
    const CompanyID = req.session.companyId;

    const activeCount = await Application.countDocuments({
      CompanyID,
      Status: { $in: ['Pending', 'In Progress'] },
    });
    if (activeCount > 0) {
      return res.status(400).json({ ok: false, message: "Cannot delete company if there is an active application." });
    }

    /* CompanyPayment and Application are historical records — anonymize
       (null out CompanyID + snapshot) instead of deleting. */
    await CompanyPayment.updateMany(
      { CompanyID },
      { $set: { CompanyID: null, company: null } }
    );
    await Application.updateMany(
      { CompanyID },
      { $set: { CompanyID: null, company: null } }
    );
    await Company.deleteOne({ CompanyID });

    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      return res.status(200).json({ ok: true, message: "Company deleted successfully." });
    });
  } catch (err) {
    return next(err);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    const cid = Number(req.query.CompanyID);
    const result = await Company.deleteOne({ CompanyID: cid });
    if (!result.deletedCount) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${cid}] does not exist or has already been deleted.`,
      });
    }
    return res.status(200).json({ Status: "OK", Message: `Record Id [${cid}] deleted Successfully` });
  } catch (err) {
    return next(err);
  }
};

export const searchCompany = async (req, res, next) => {
  try {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? -1 : 1;

    const allowedColumns = ['CompanyID', 'Name', 'ContactEmail', 'TaxNumber', 'VerficationStatus'];
    if (!allowedColumns.includes(keyword)) {
      return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
      return res.status(400).json({ error: 'keyvalue is required' });
    }

    const value = (keyword === 'CompanyID' || keyword === 'TaxNumber') ? Number(keyvalue) : keyvalue;
    const rows = await Company.find({ [keyword]: value }, PUBLIC_COMPANY_FIELDS).sort({ CompanyID: sort }).lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

export const updateCompanyProfile = async (req, res, next) => {
  try {
    const CompanyID = req.session.companyId;
    const existing = await Company.findOne({ CompanyID });
    if (!existing) {
      return res.status(404).json({ ok: false, message: "Company not found." });
    }

    const incomingEmail = req.body.ContactEmail !== undefined ? normalizeEmail(req.body.ContactEmail) : null;
    if (incomingEmail !== null) {
      if (!isValidEmail(incomingEmail)) {
        return res.status(400).json({ ok: false, message: "Valid contact email is required." });
      }
      if (incomingEmail !== existing.ContactEmail) {
        const dup = await Company.findOne({
          ContactEmail: incomingEmail,
          CompanyID: { $ne: CompanyID },
        }).select({ _id: 1 });
        if (dup) {
          return res.status(409).json({ ok: false, message: "Another company already uses that email." });
        }
      }
    }

    const Governorate  = req.body.Governorate !== undefined ? String(req.body.Governorate).trim() : existing.Governorate;
    const Address      = req.body.Address     !== undefined ? String(req.body.Address).trim()     : existing.Address;
    const ContactEmail = incomingEmail !== null ? incomingEmail : existing.ContactEmail;
    const About        = req.body.About       !== undefined ? String(req.body.About).trim()       : existing.About;

    const logoFile = req.files?.logo?.[0];
    let LogoUrl = existing.LogoUrl;
    if (logoFile?.buffer) {
      const uploaded = await uploadToCloudinary(logoFile.buffer, companyFolder(existing.Name, "logo"));
      LogoUrl = uploaded.secure_url;
      if (existing.LogoUrl) {
        await destroyCloudinaryAsset(existing.LogoUrl);
      }
    }

    await Company.updateOne(
      { CompanyID },
      { $set: { Governorate, Address, ContactEmail, About, LogoUrl } }
    );

    /* Fan-out: every Application snapshot of this company's Name/LogoUrl
       needs the snapshot refreshed. Name is immutable here but LogoUrl
       can change. */
    await Application.updateMany(
      { CompanyID },
      { $set: { 'company.Name': existing.Name, 'company.LogoUrl': LogoUrl } }
    );

    const updated = await Company.findOne({ CompanyID }, PUBLIC_COMPANY_FIELDS).lean();

    return res.status(200).json({
      ok: true,
      message: "Profile updated.",
      data: { company: updated },
    });
  } catch (err) {
    return next(err);
  }
};

/* Bulk pricing upsert — sets the embedded `categories` array on the
   Company doc. Each entry is { CategoryID, Price, Type }. */
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

    /* Pull Category.Type for each requested ID so the embedded subdoc
       can carry the denormalized name. */
    const Category = (await import('../../Database/mongo/category.mongo.js')).default;
    const existingCats = await Category.find({ CategoryID: { $in: cleaned.map((r) => r.CategoryID) } }).lean();
    const byId = new Map(existingCats.map((c) => [c.CategoryID, c.Type]));
    for (const r of cleaned) {
      if (!byId.has(r.CategoryID)) {
        return res.status(400).json({
          ok: false,
          message: `CategoryID ${r.CategoryID} does not exist.`,
        });
      }
    }

    /* Replace-merge strategy: preserve any category not in the request,
       upsert the ones that are. Mirrors the SQL "INSERT … ON DUPLICATE
       KEY UPDATE" behavior. */
    const company = await Company.findOne({ CompanyID });
    if (!company) {
      return res.status(404).json({ ok: false, message: "Company not found." });
    }
    const existingMap = new Map((company.categories || []).map((c) => [c.CategoryID, c]));
    for (const r of cleaned) {
      existingMap.set(r.CategoryID, {
        CategoryID: r.CategoryID,
        Type: byId.get(r.CategoryID),
        Price: r.Price,
      });
    }
    const merged = Array.from(existingMap.values());

    await Company.updateOne({ CompanyID }, { $set: { categories: merged } });

    const updated = merged.map((c) => ({
      CompanyID,
      CategoryID: c.CategoryID,
      Price: c.Price,
    }));

    return res.status(200).json({
      ok: true,
      message: `Saved pricing for ${cleaned.length} categor${cleaned.length === 1 ? "y" : "ies"}.`,
      data: { prices: updated },
    });
  } catch (err) {
    return next(err);
  }
};

const PLATFORM_FEE = 1600;

export const getCompanyDashboardStats = async (req, res, next) => {
  try {
    const CompanyID = req.session?.companyId;
    if (!CompanyID) {
      return res.status(401).json({ ok: false, message: "Company sign-in required." });
    }

    const company = await Company.findOne({ CompanyID }).select({ Comm: 1 }).lean();
    if (!company) {
      return res.status(404).json({ ok: false, message: "Company not found." });
    }
    const CommPercentage = Number(company.Comm) || 0;

    /* Sum every payment amount across this company's Completed apps.
       Payments live as an embedded array, so unwind then group. */
    const [agg] = await Application.aggregate([
      { $match: { CompanyID, Status: 'Completed' } },
      { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
      { $group: { _id: null, total: { $sum: '$payments.Amount' } } },
    ]);
    const Revenue = Number(agg?.total ?? 0);
    const CommissionAmount = (Revenue * CommPercentage) / 100;
    const NetEarnings = Math.max(0, Revenue - (PLATFORM_FEE + CommissionAmount));

    return res.status(200).json({
      ok: true,
      data: {
        CompanyID,
        CompletedRevenue: Revenue,
        Comm: CommPercentage,
        CommissionAmount,
        PlatformFee: PLATFORM_FEE,
        NetEarnings,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const generatePerformanceReport = async (req, res, next) => {
  try {
    const CompanyID = req.session?.companyId;
    if (!CompanyID) {
      return res.status(401).json({ ok: false, message: "Company sign-in required." });
    }

    const company = await Company.findOne({ CompanyID }).select({ Name: 1, Comm: 1 }).lean();
    if (!company) {
      return res.status(404).json({ ok: false, message: "Company not found." });
    }
    const CommPercentage = Number(company.Comm) || 0;

    const [revAgg] = await Application.aggregate([
      { $match: { CompanyID, Status: 'Completed' } },
      { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
      { $group: { _id: null, total: { $sum: '$payments.Amount' } } },
    ]);
    const TotalRevenue = Number(revAgg?.total ?? 0);
    const CommissionAmount = (TotalRevenue * CommPercentage) / 100;
    const NetRevenue = Math.max(0, TotalRevenue - PLATFORM_FEE - CommissionAmount);

    const statusAgg = await Application.aggregate([
      { $match: { CompanyID } },
      { $group: { _id: '$Status', n: { $sum: 1 } } },
    ]);
    const statusBy = Object.fromEntries(statusAgg.map((r) => [r._id, r.n]));
    const CompletedCount  = Number(statusBy.Completed     ?? 0);
    const PendingCount    = Number(statusBy.Pending       ?? 0);
    const InProgressCount = Number(statusBy['In Progress'] ?? 0);

    const topCategories = await Application.aggregate([
      { $match: { CompanyID } },
      {
        $project: {
          CategoryID: 1,
          'category.Type': 1,
          paymentTotal: { $sum: '$payments.Amount' },
        },
      },
      {
        $group: {
          _id: { CategoryID: '$CategoryID', Type: '$category.Type' },
          AppCount: { $sum: 1 },
          Revenue: { $sum: '$paymentTotal' },
        },
      },
      { $sort: { Revenue: -1, AppCount: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          CategoryName: '$_id.Type',
          AppCount: 1,
          Revenue: 1,
        },
      },
    ]);

    const reviews = await Review.find({ CompanyID }).sort({ ReviewID: -1 }).limit(5).lean();

    await Company.updateOne({ CompanyID }, { $inc: { PdfExportCount: 1 } });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Company_Performance_Report.pdf"'
    );

    const doc = new PDFDocument({ size: "A4", margin: 50 });

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
      doc.strokeColor("#000000").lineWidth(0.5).moveTo(LEFT, y).lineTo(LEFT + PAGE_WIDTH, y).stroke();
      doc.moveDown(0.6);
    };

    const sectionTitle = (label) => {
      doc.moveDown(1);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000")
        .text(label.toUpperCase(), LEFT, doc.y, { width: PAGE_WIDTH, align: "center", characterSpacing: 1.5 });
      doc.moveDown(0.4);
    };

    const row = (label, value) => {
      const y = doc.y;
      doc.font("Helvetica").fontSize(10).fillColor("#000000").text(label, LEFT, y);
      doc.font("Helvetica-Bold").fillColor("#000000").text(value, LEFT, y, { width: PAGE_WIDTH, align: "right" });
      doc.moveDown(0.3);
    };

    const fmtMoney = (n) =>
      "EGP " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const LOGO_WIDTH = 100;
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, (doc.page.width - LOGO_WIDTH) / 2, doc.y, { width: LOGO_WIDTH });
      doc.y += LOGO_WIDTH + 8;
    }
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#000000")
      .text("Takhlees", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    doc.font("Helvetica").fontSize(9).fillColor("#000000")
      .text("Customs clearance, simplified.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    hr(4);

    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#000000")
      .text(`${company.Name} Performance Report`, LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor("#000000")
      .text(`Generated ${new Date().toISOString().slice(0, 10)}`, LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });

    sectionTitle("Financials");
    row("Total Revenue", fmtMoney(TotalRevenue));
    row(`Commission (${CommPercentage}%)`, fmtMoney(CommissionAmount));
    row("Platform Fee", fmtMoney(PLATFORM_FEE));
    row("Net Revenue", fmtMoney(NetRevenue));

    sectionTitle("Applications Status");
    row("Completed", String(CompletedCount));
    row("In Progress", String(InProgressCount));
    row("Pending", String(PendingCount));

    sectionTitle("Top Categories");
    if (!topCategories.length) {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor("#000000")
        .text("No category activity yet.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    } else {
      topCategories.forEach((c, i) => {
        const y = doc.y;
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
          .text(`${i + 1}. ${c.CategoryName ?? '—'}`, LEFT, y);
        doc.font("Helvetica").fillColor("#000000")
          .text(`${c.AppCount} application${c.AppCount === 1 ? "" : "s"} · ${fmtMoney(c.Revenue)}`, LEFT, y,
            { width: PAGE_WIDTH, align: "right" });
        doc.moveDown(0.3);
      });
    }

    sectionTitle("Latest Reviews");
    if (!reviews.length) {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor("#000000")
        .text("No reviews yet.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    } else {
      reviews.forEach((r) => {
        const stars = "★".repeat(Math.max(0, Math.min(5, Number(r.Rating) || 0)));
        const author = `${r.client?.FirstName ?? ""} ${r.client?.LastName ?? ""}`.trim() || "Anonymous";
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text(`${author} `, { continued: true });
        doc.font("Helvetica").fillColor("#000000").text(`${stars}  (${r.Rating}/5)`);
        if (r.Review) {
          doc.font("Helvetica").fontSize(10).fillColor("#000000").text(`"${r.Review}"`);
        }
        doc.moveDown(0.3);
      });
    }

    doc.fillColor("#888888").fontSize(10);
    doc.font("Helvetica-Bold")
      .text("Takhlees", 20, doc.page.height - 70, {
        align: "center", width: doc.page.width - 40, lineBreak: false,
      });

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      return next(err);
    }
    res.destroy(err);
  }
};

/* Matchmaker: returns Verified companies that serve the given governorate
   AND price the given category in [minPrice, maxPrice], ranked by fulfilled
   count for that (company, category) and then by average review rating. */
export const recommendCompanies = async (req, res, next) => {
  try {
    const governorate = typeof req.body.governorate === "string" ? req.body.governorate.trim() : "";
    const category    = typeof req.body.category    === "string" ? req.body.category.trim()    : "";
    const minPrice    = Number(req.body.minPrice);
    const maxPrice    = Number(req.body.maxPrice);

    if (!governorate) return res.status(400).json({ ok: false, message: "governorate is required." });
    if (!category) return res.status(400).json({ ok: false, message: "category is required." });
    if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice < 0 || maxPrice < 0) {
      return res.status(400).json({ ok: false, message: "minPrice and maxPrice must be non-negative numbers." });
    }
    if (minPrice > maxPrice) {
      return res.status(400).json({ ok: false, message: "minPrice cannot be greater than maxPrice." });
    }

    /* Filter candidate companies via the embedded categories array, then
       compute the two ranking signals from Application and Review. */
    const companies = await Company.find({
      Governorate: governorate,
      VerficationStatus: 'Verified',
      categories: {
        $elemMatch: {
          Type: category,
          Price: { $gte: minPrice, $lte: maxPrice },
        },
      },
    }).lean();

    if (!companies.length) return res.status(200).json({ ok: true, data: [] });

    const companyIds = companies.map((c) => c.CompanyID);

    /* Fulfilled count per (company, category). */
    const fulfilledAgg = await Application.aggregate([
      { $match: { CompanyID: { $in: companyIds }, Status: 'Completed' } },
      { $group: { _id: { c: '$CompanyID', cat: '$CategoryID' }, n: { $sum: 1 } } },
    ]);
    const fulfilledMap = new Map();
    for (const r of fulfilledAgg) fulfilledMap.set(`${r._id.c}:${r._id.cat}`, r.n);

    /* Average rating per (company, category). */
    const ratingAgg = await Review.aggregate([
      { $match: { CompanyID: { $in: companyIds } } },
      { $group: { _id: { c: '$CompanyID', cat: '$CategoryID' }, avg: { $avg: '$Rating' } } },
    ]);
    const ratingMap = new Map();
    for (const r of ratingAgg) ratingMap.set(`${r._id.c}:${r._id.cat}`, r.avg);

    const rows = [];
    for (const c of companies) {
      /* The candidate filter ensured at least one matching category;
         find the specific one to pull its CategoryID and Price. */
      const match = (c.categories || []).find((cc) => cc.Type === category && cc.Price >= minPrice && cc.Price <= maxPrice);
      if (!match) continue;
      const key = `${c.CompanyID}:${match.CategoryID}`;
      const FulfilledCount = fulfilledMap.get(key) ?? 0;
      const avg = ratingMap.get(key);
      rows.push({
        CompanyID: c.CompanyID,
        Name: c.Name,
        ContactEmail: c.ContactEmail,
        Governorate: c.Governorate,
        Address: c.Address,
        About: c.About,
        LogoUrl: c.LogoUrl,
        VerficationStatus: c.VerficationStatus,
        CategoryID: match.CategoryID,
        CategoryType: match.Type,
        CategoryPrice: Number(match.Price),
        FulfilledCount: Number(FulfilledCount),
        AverageRating: avg == null ? null : Number(Number(avg).toFixed(2)),
      });
    }

    rows.sort((a, b) => {
      if (b.FulfilledCount !== a.FulfilledCount) return b.FulfilledCount - a.FulfilledCount;
      const ar = a.AverageRating ?? -Infinity;
      const br = b.AverageRating ?? -Infinity;
      if (br !== ar) return br - ar;
      return a.Name.localeCompare(b.Name);
    });

    return res.status(200).json({ ok: true, data: rows });
  } catch (err) {
    return next(err);
  }
};

/* Admin-only: update strictly the Comm percentage for a given CompanyID.
   No other field on the Company doc is touched. Comm is not embedded in
   any snapshot, so no fan-out is required. */
export const updateCompanyCommission = async (req, res, next) => {
  try {
    const cid = Number(req.params.id);
    if (!Number.isInteger(cid) || cid <= 0) {
      return res.status(400).json({ ok: false, message: "Valid CompanyID is required." });
    }

    const Comm = Number(req.body?.Comm);
    if (!Number.isFinite(Comm) || Comm < 0 || Comm > 100) {
      return res.status(400).json({ ok: false, message: "Comm must be a number between 0 and 100." });
    }

    const result = await Company.updateOne({ CompanyID: cid }, { $set: { Comm } });
    if (!result.matchedCount) {
      return res.status(404).json({ ok: false, message: `Company [${cid}] not found.` });
    }

    return res.status(200).json({
      ok: true,
      message: `Commission updated for company ${cid}.`,
      data: { CompanyID: cid, Comm },
    });
  } catch (err) {
    return next(err);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const cid = Number(req.query.CompanyID);
    const existing = await Company.findOne({ CompanyID: cid });
    if (!existing) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${cid}] does not exist or has already been deleted. Update aborted.`,
      });
    }

    const $set = {};
    if (req.body.Name              !== undefined) $set.Name              = req.body.Name;
    if (req.body.ContactEmail      !== undefined) $set.ContactEmail      = normalizeEmail(req.body.ContactEmail);
    if (req.body.FoundingDate      !== undefined) $set.FoundingDate      = req.body.FoundingDate;
    if (req.body.Password          !== undefined) $set.Password          = req.body.Password;
    if (req.body.Comm              !== undefined) $set.Comm              = Number(req.body.Comm);
    if (req.body.RegistrationDate  !== undefined) $set.RegistrationDate  = req.body.RegistrationDate;
    if (req.body.TaxNumber         !== undefined) $set.TaxNumber         = Number(req.body.TaxNumber);
    if (req.body.VerficationStatus !== undefined) $set.VerficationStatus = req.body.VerficationStatus;
    if (req.body.ComReg            !== undefined) $set.ComReg            = req.body.ComReg;
    if (req.body.Governorate       !== undefined) $set.Governorate       = req.body.Governorate;
    if (req.body.Address           !== undefined) $set.Address           = req.body.Address;
    if (req.body.About             !== undefined) $set.About             = req.body.About;

    await Company.updateOne({ CompanyID: cid }, { $set });

    return res.status(200).json({ Status: "OK", Message: `Record Id [${cid}] is Updated Successfully` });
  } catch (err) {
    return next(err);
  }
};
