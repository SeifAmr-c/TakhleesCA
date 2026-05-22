import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Application from '../../Database/mongo/application.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import CompanyPayment from '../../Database/mongo/company_payment.mongo.js';
import SupportTicket from '../../Database/mongo/support_ticket.mongo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../../../frontend/src/assets/logo.png');

const COMPANY_PUBLIC = {
  CompanyID: 1, Name: 1, ContactEmail: 1, FoundingDate: 1, Comm: 1,
  RegistrationDate: 1, TaxNumber: 1, VerficationStatus: 1, ComReg: 1,
  Governorate: 1, Address: 1, About: 1, LogoUrl: 1,
};

/* Platform revenue is the CompanyPayment ledger: every row already carries
   the platform's actual take (FixedFee + Commission + ListingFee) in Amount,
   with the listing fee charged only once per company per month. So we sum
   the ledger directly rather than re-deriving a per-application formula.
   Each row is joined back to its application (via PaymentID) to recover the
   category for the by-category breakdown; company name comes from the
   ledger's own snapshot. */
const aggregateRevenue = async (matchExtra = {}) => {
  const rows = await CompanyPayment.aggregate([
    { $match: { ...matchExtra } },
    {
      $lookup: {
        from: 'applications',
        localField: 'PaymentID',
        foreignField: 'payments.PaymentID',
        as: '_app',
      },
    },
    { $unwind: { path: '$_app', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        CompanyID: 1,
        CategoryID: '$_app.CategoryID',
        'category.Type': '$_app.category.Type',
        '_company.Name': '$company.Name',
        revenue: '$Amount',
      },
    },
  ]);
  return rows;
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const [TotalRequests, TotalTransactions, revenueRows] = await Promise.all([
      Application.countDocuments({}),
      Application.countDocuments({ Status: 'Completed' }),
      aggregateRevenue(),
    ]);
    const TotalWebsiteRevenue = revenueRows.reduce((s, r) => s + Number(r.revenue || 0), 0);

    return res.json({
      ok: true,
      data: {
        TotalRequests,
        TotalTransactions,
        TotalWebsiteRevenue,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const listPendingCompanies = async (req, res, next) => {
  try {
    const rows = await Company.find({ VerficationStatus: 'Pending' }, COMPANY_PUBLIC).sort({ CompanyID: -1 }).lean();
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    return next(err);
  }
};

export const listVerifiedCompanies = async (req, res, next) => {
  try {
    const rows = await Company.find({ VerficationStatus: 'Verified' }, COMPANY_PUBLIC).sort({ CompanyID: -1 }).lean();
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    return next(err);
  }
};

export const verifyCompany = async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(400).json({ ok: false, message: "Invalid company id." });
    }

    let nextStatus = null;
    const rawStatus = req.body?.status;
    if (typeof rawStatus === 'string') {
      const normalized = rawStatus.trim().toLowerCase();
      if (normalized === 'verified') nextStatus = 'Verified';
      else if (normalized === 'rejected') nextStatus = 'Rejected';
      else if (normalized === 'pending') nextStatus = 'Pending';
    } else if (typeof req.body?.verified === 'boolean') {
      nextStatus = req.body.verified ? 'Verified' : 'Rejected';
    }

    if (!nextStatus) {
      return res.status(400).json({
        ok: false,
        message: "Body must include `status` ('Verified' | 'Rejected' | 'Pending') or boolean `verified`.",
      });
    }

    const existing = await Company.findOne({ CompanyID: companyId }).select({ _id: 1 });
    if (!existing) {
      return res.status(404).json({ ok: false, message: `Company [${companyId}] not found.` });
    }

    await Company.updateOne({ CompanyID: companyId }, { $set: { VerficationStatus: nextStatus } });

    /* Cascade to embedded documents on every application this company
       owns. Enum mismatch: Document uses ('Pending','Accepted','Rejected'),
       so 'Verified' on Company maps to 'Accepted' on Document. */
    const docStatus =
      nextStatus === 'Verified' ? 'Accepted' :
      nextStatus === 'Rejected' ? 'Rejected' : 'Pending';

    await Application.updateMany(
      { CompanyID: companyId },
      { $set: { 'documents.$[].VerficationStatus': docStatus } }
    );

    const updated = await Company.findOne({ CompanyID: companyId }, COMPANY_PUBLIC).lean();

    return res.json({
      ok: true,
      message: `Company [${companyId}] verification status set to ${nextStatus}.`,
      data: { company: updated },
    });
  } catch (err) {
    return next(err);
  }
};

export const rejectCompany = async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    if (!Number.isInteger(companyId) || companyId < 1) {
      return res.status(400).json({ ok: false, message: "Invalid company id." });
    }

    const existing = await Company.findOne({ CompanyID: companyId }).select({ _id: 1 });
    if (!existing) {
      return res.status(404).json({ ok: false, message: `Company [${companyId}] not found.` });
    }

    /* Anonymize historical records so payments and applications remain
       readable for audit/reporting; only the Company doc is removed. */
    await CompanyPayment.updateMany(
      { CompanyID: companyId },
      { $set: { CompanyID: null, company: null } }
    );
    await Application.updateMany(
      { CompanyID: companyId },
      { $set: { CompanyID: null, company: null } }
    );
    await Company.deleteOne({ CompanyID: companyId });

    return res.json({
      ok: true,
      message: `Company [${companyId}] rejected and deleted.`,
    });
  } catch (err) {
    return next(err);
  }
};

/* Shape a SupportTicket doc back into the legacy row shape the admin
   queue UI expects (flat names + ticket fields together). */
const shapeTicket = (t) => ({
  TicketID: t.TicketID,
  Issue: t.Issue,
  Resolved: t.Resolved ? 1 : 0,
  AdminID: t.AdminID,
  ClientID: t.ClientID,
  ClientFirstName: t.client?.FirstName ?? null,
  ClientLastName:  t.client?.LastName  ?? null,
  ClientEmail:     t.client?.Email     ?? null,
  AdminFirstName:  t.admin?.FirstName  ?? null,
  AdminLastName:   t.admin?.LastName   ?? null,
  AdminEmail:      null, /* not stored in the admin snapshot */
});

export const listPendingTickets = async (req, res, next) => {
  try {
    const rows = await SupportTicket.find({ Resolved: false }).sort({ TicketID: -1 }).lean();
    const data = rows.map(shapeTicket);
    return res.json({ ok: true, count: data.length, data });
  } catch (err) {
    return next(err);
  }
};

export const listResolvedTickets = async (req, res, next) => {
  try {
    const rows = await SupportTicket.find({ Resolved: true }).sort({ TicketID: -1 }).lean();
    const data = rows.map(shapeTicket);
    return res.json({ ok: true, count: data.length, data });
  } catch (err) {
    return next(err);
  }
};

export const resolveTicket = async (req, res, next) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId < 1) {
      return res.status(400).json({ ok: false, message: "Invalid ticket id." });
    }

    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ ok: false, message: "Authentication required." });
    }

    const existing = await SupportTicket.findOne({ TicketID: ticketId }).select({ _id: 1 });
    if (!existing) {
      return res.status(404).json({ ok: false, message: `Ticket [${ticketId}] not found.` });
    }

    /* Pull admin snapshot so the UI can show who resolved it. */
    const User = (await import('../../Database/mongo/user.mongo.js')).default;
    const admin = await User.findOne({ UserID: adminId }).select({ FirstName: 1, LastName: 1 }).lean();

    await SupportTicket.updateOne(
      { TicketID: ticketId },
      { $set: {
        Resolved: true,
        AdminID: adminId,
        admin: admin ? { FirstName: admin.FirstName, LastName: admin.LastName } : null,
      } }
    );

    const updated = await SupportTicket.findOne({ TicketID: ticketId }).lean();
    return res.json({
      ok: true,
      message: `Ticket [${ticketId}] marked resolved.`,
      data: { ticket: shapeTicket(updated) },
    });
  } catch (err) {
    return next(err);
  }
};

export const generateExecutiveReport = async (req, res, next) => {
  try {
    /* Platform revenue from the CompanyPayment ledger (same source as /admin/stats). */
    const revenueRows = await aggregateRevenue();
    const TotalWebsiteRevenue = revenueRows.reduce((s, r) => s + Number(r.revenue || 0), 0);

    /* Top category by revenue. */
    const byCategory = new Map();
    for (const r of revenueRows) {
      const key = r.CategoryID;
      const cur = byCategory.get(key) || { CategoryName: r.category?.Type ?? null, Revenue: 0 };
      cur.Revenue += Number(r.revenue || 0);
      byCategory.set(key, cur);
    }
    let TopCategoryName = null;
    let TopCategoryRevenue = 0;
    for (const v of byCategory.values()) {
      if (v.Revenue > TopCategoryRevenue) {
        TopCategoryRevenue = v.Revenue;
        TopCategoryName = v.CategoryName;
      }
    }

    const VerifiedCompanies = await Company.countDocuments({ VerficationStatus: 'Verified' });

    /* Top 3 companies by revenue. */
    const byCompany = new Map();
    for (const r of revenueRows) {
      const key = r.CompanyID;
      const cur = byCompany.get(key) || { CompanyID: key, Name: r._company?.Name ?? null, TransactionCount: 0, Revenue: 0 };
      cur.TransactionCount += 1;
      cur.Revenue += Number(r.revenue || 0);
      byCompany.set(key, cur);
    }
    const topCompanies = Array.from(byCompany.values())
      .sort((a, b) => (b.Revenue - a.Revenue) || (b.TransactionCount - a.TransactionCount))
      .slice(0, 3);

    const FulfilledApplications = await Application.countDocuments({ Status: 'Completed' });
    const pendingCompanies = await Company.find({ VerficationStatus: 'Pending' })
      .select({ CompanyID: 1, Name: 1, _id: 0 }).sort({ CompanyID: -1 }).lean();

    const tickets = await SupportTicket.find({}).sort({ TicketID: -1 }).select({ TicketID: 1, Issue: 1, Resolved: 1 }).lean();
    const TotalTickets = tickets.length;
    const ResolvedTickets = tickets.filter((t) => t.Resolved).length;
    const UnresolvedTickets = TotalTickets - ResolvedTickets;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Takhlees_Executive_Report.pdf"'
    );

    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
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
      .text("Takhlees Platform - Executive Report", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor("#000000")
      .text(`Generated ${new Date().toISOString().slice(0, 10)}`, LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });

    sectionTitle("Financial Overview");
    row("Total Platform Revenue", fmtMoney(TotalWebsiteRevenue));
    row("Top Revenue Category",
      TopCategoryName ? `${TopCategoryName} (${fmtMoney(TopCategoryRevenue)})` : "—");

    sectionTitle("Platform Network");
    row("Total Verified Companies", String(VerifiedCompanies));
    doc.moveDown(0.3);
    if (!topCompanies.length) {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor("#000000")
        .text("No revenue activity yet.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    } else {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
        .text("Top 3 Companies", LEFT, doc.y, { width: PAGE_WIDTH });
      doc.moveDown(0.2);
      topCompanies.forEach((c, i) => {
        const y = doc.y;
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
          .text(`${i + 1}. ${c.Name ?? '—'}`, LEFT, y);
        doc.font("Helvetica").fillColor("#000000")
          .text(`${c.TransactionCount} transactions · ${fmtMoney(c.Revenue)}`, LEFT, y, { width: PAGE_WIDTH, align: "right" });
        doc.moveDown(0.3);
      });
    }

    sectionTitle("Operations");
    row("Total Fulfilled Applications", String(FulfilledApplications));

    sectionTitle("Action Required");
    row("Pending Companies", String(pendingCompanies.length));
    if (pendingCompanies.length) {
      doc.moveDown(0.2);
      pendingCompanies.forEach((c) => {
        doc.font("Helvetica").fontSize(10).fillColor("#000000")
          .text(`• ${c.Name}`, LEFT + 10, doc.y, { width: PAGE_WIDTH - 10 });
        doc.moveDown(0.15);
      });
    }

    sectionTitle("Customer Support");
    if (!tickets.length) {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor("#000000")
        .text("No support tickets on record.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    } else {
      const tableWidth = 450;
      const rowHeight = 25;
      const startX = (doc.page.width - tableWidth) / 2;
      const colSplitX = startX + tableWidth * 0.7;
      const cellPadX = 8;
      const paddingY = 8;
      const issueColWidth = colSplitX - startX - cellPadX * 2;
      const rightColX = colSplitX;
      const rightColWidth = startX + tableWidth - colSplitX;

      doc.lineWidth(0.5).strokeColor("#000000");

      const drawRowBorders = (yTop) => {
        doc.moveTo(startX, yTop + rowHeight).lineTo(startX + tableWidth, yTop + rowHeight).stroke();
        doc.moveTo(colSplitX, yTop).lineTo(colSplitX, yTop + rowHeight).stroke();
        doc.moveTo(startX, yTop).lineTo(startX, yTop + rowHeight).stroke();
        doc.moveTo(startX + tableWidth, yTop).lineTo(startX + tableWidth, yTop + rowHeight).stroke();
      };

      let tableTop = doc.y;
      doc.moveTo(startX, tableTop).lineTo(startX + tableWidth, tableTop).stroke();
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000")
        .text("Issue / Subject", startX + cellPadX, tableTop + paddingY, { width: issueColWidth, lineBreak: false, ellipsis: true })
        .text("Status", rightColX, tableTop + paddingY, { width: rightColWidth, align: "center", lineBreak: false, ellipsis: true });
      drawRowBorders(tableTop);

      const FOOTER_RESERVE = 80;
      tickets.forEach((t) => {
        if (doc.y + rowHeight > doc.page.height - FOOTER_RESERVE) doc.addPage();
        const yTop = doc.y;
        const issueText = String(t.Issue || "—");
        const statusText = `Resolved: ${t.Resolved ? "Yes" : "No"}`;
        doc.font("Helvetica").fontSize(10).fillColor("#000000")
          .text(issueText, startX + cellPadX, yTop + paddingY, { width: issueColWidth, lineBreak: false, ellipsis: true })
          .text(statusText, rightColX, yTop + paddingY, { width: rightColWidth, align: "center", lineBreak: false });
        drawRowBorders(yTop);
        doc.y = yTop + rowHeight;
      });
    }

    doc.moveDown(1);
    const SUMMARY_HEIGHT = 80;
    if (doc.y + SUMMARY_HEIGHT > doc.page.height - 80) doc.addPage();
    row("Total Tickets", String(TotalTickets));
    row("Total Resolved", String(ResolvedTickets));
    row("Total Unresolved", String(UnresolvedTickets));

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.lineWidth(1).strokeColor("#000000")
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke();
      doc.fillColor("#888888").fontSize(10).font("Helvetica-Bold")
        .text("Takhlees", 20, doc.page.height - 70, {
          align: "center", width: doc.page.width - 40, lineBreak: false,
        });
    }

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      return next(err);
    }
    res.destroy(err);
  }
};
