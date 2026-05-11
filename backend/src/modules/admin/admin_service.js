import db from '../../Database/connection.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../../../frontend/src/assets/logo.png');

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const COMPANY_COLS =
  "CompanyID, Name, ContactEmail, FoundingDate, Comm, RegistrationDate, " +
  "TaxNumber, VerficationStatus, ComReg, Governorate, Address, About";

// ── GET /admin/stats ────────────────────────────────────────────
// Returns the top dashboard stats. Revenue formula: for each Completed
// application that has a payment, the platform takes a flat 1600 fee plus
// the company's commission percentage on the payment amount.
export const getDashboardStats = async (req, res, next) => {
  try {
    const [row] = await runQuery(
      `SELECT
         (SELECT COUNT(*) FROM application) AS TotalRequests,
         (SELECT COUNT(*) FROM application WHERE Status = 'Completed') AS TotalTransactions,
         (
           SELECT COALESCE(SUM(1600 + ((p.Amount * c.Comm) / 100)), 0)
           FROM application a
           JOIN payment p ON a.ApplicationID = p.ApplicationID
           JOIN company  c ON a.CompanyID    = c.CompanyID
           WHERE a.Status = 'Completed'
         ) AS TotalWebsiteRevenue
      `
    );

    return res.json({
      ok: true,
      data: {
        TotalRequests: Number(row.TotalRequests) || 0,
        TotalTransactions: Number(row.TotalTransactions) || 0,
        TotalWebsiteRevenue: Number(row.TotalWebsiteRevenue) || 0,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /admin/companies/pending ────────────────────────────────
export const listPendingCompanies = async (req, res, next) => {
  try {
    const rows = await runQuery(
      `SELECT ${COMPANY_COLS} FROM company WHERE VerficationStatus = ? ORDER BY CompanyID DESC`,
      ['Pending']
    );
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    return next(err);
  }
};

// ── GET /admin/companies/verified ───────────────────────────────
export const listVerifiedCompanies = async (req, res, next) => {
  try {
    const rows = await runQuery(
      `SELECT ${COMPANY_COLS} FROM company WHERE VerficationStatus = ? ORDER BY CompanyID DESC`,
      ['Verified']
    );
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    return next(err);
  }
};

/* PUT /admin/companies/:id/verify
   Accepts either { status: 'Verified' | 'Rejected' | 'Pending' } or a boolean
   { verified: true | false } where true → 'Verified' and false → 'Rejected'. */
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

    const existing = await runQuery(
      "SELECT CompanyID FROM company WHERE CompanyID = ? LIMIT 1",
      [companyId]
    );
    if (!existing.length) {
      return res.status(404).json({ ok: false, message: `Company [${companyId}] not found.` });
    }

    await runQuery(
      "UPDATE company SET VerficationStatus = ? WHERE CompanyID = ?",
      [nextStatus, companyId]
    );

    // Cascade to documents. The Document table FK is ApplicationID, so we join
    // through application to find every document tied to this company. Note
    // the enum mismatch: Document allows ('Pending','Accepted','Rejected'),
    // so 'Verified' on Company maps to 'Accepted' on Document.
    const docStatus =
      nextStatus === 'Verified' ? 'Accepted' :
      nextStatus === 'Rejected' ? 'Rejected' : 'Pending';

    await runQuery(
      `UPDATE document d
         JOIN application a ON d.ApplicationID = a.ApplicationID
          SET d.VerficationStatus = ?
        WHERE a.CompanyID = ?`,
      [docStatus, companyId]
    );

    const updated = await runQuery(
      `SELECT ${COMPANY_COLS} FROM company WHERE CompanyID = ?`,
      [companyId]
    );

    return res.json({
      ok: true,
      message: `Company [${companyId}] verification status set to ${nextStatus}.`,
      data: { company: updated[0] },
    });
  } catch (err) {
    return next(err);
  }
};

const TICKET_SELECT_SQL = `
  SELECT
    t.TicketID, t.Issue, t.Resolved, t.AdminID, t.ClientID,
    cu.FirstName AS ClientFirstName, cu.LastName AS ClientLastName, cu.Email AS ClientEmail,
    au.FirstName AS AdminFirstName, au.LastName AS AdminLastName, au.Email AS AdminEmail
  FROM supportticket t
  LEFT JOIN User cu ON t.ClientID = cu.UserID
  LEFT JOIN User au ON t.AdminID  = au.UserID
`;

// ── GET /admin/tickets/pending ──────────────────────────────────
export const listPendingTickets = async (req, res, next) => {
  try {
    const rows = await runQuery(
      `${TICKET_SELECT_SQL} WHERE t.Resolved = 0 ORDER BY t.TicketID DESC`
    );
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    return next(err);
  }
};

// ── GET /admin/tickets/resolved ─────────────────────────────────
export const listResolvedTickets = async (req, res, next) => {
  try {
    const rows = await runQuery(
      `${TICKET_SELECT_SQL} WHERE t.Resolved = 1 ORDER BY t.TicketID DESC`
    );
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    return next(err);
  }
};

/* PUT /admin/tickets/:id/resolve
   Marks the ticket as resolved and stamps the AdminID with the currently
   signed-in admin's UserID (from req.session.userId — Admin.AdminID is a
   1:1 FK to User.UserID). */
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

    const existing = await runQuery(
      "SELECT TicketID FROM supportticket WHERE TicketID = ? LIMIT 1",
      [ticketId]
    );
    if (!existing.length) {
      return res.status(404).json({ ok: false, message: `Ticket [${ticketId}] not found.` });
    }

    await runQuery(
      "UPDATE supportticket SET Resolved = 1, AdminID = ? WHERE TicketID = ?",
      [adminId, ticketId]
    );

    const updated = await runQuery(
      `${TICKET_SELECT_SQL} WHERE t.TicketID = ?`,
      [ticketId]
    );

    return res.json({
      ok: true,
      message: `Ticket [${ticketId}] marked resolved.`,
      data: { ticket: updated[0] },
    });
  } catch (err) {
    return next(err);
  }
};

/* GET /admin/export-report  (requires admin session)
   Aggregates platform-wide KPIs and streams an Executive Report PDF.
   Layout mirrors the Company Performance PDF: 1pt page border, centered
   logo + Takhlees header, receipt-style left/right rows, grey footer. */
export const generateExecutiveReport = async (req, res, next) => {
  try {
    // Total platform revenue: same formula as /admin/stats — flat 1600 fee
    // plus the company's commission percentage on each completed payment.
    const [revRow] = await runQuery(
      `SELECT COALESCE(SUM(1600 + ((p.Amount * c.Comm) / 100)), 0) AS TotalWebsiteRevenue
         FROM application a
         JOIN payment p ON a.ApplicationID = p.ApplicationID
         JOIN company  c ON a.CompanyID    = c.CompanyID
        WHERE a.Status = 'Completed'`
    );
    const TotalWebsiteRevenue = Number(revRow?.TotalWebsiteRevenue ?? 0);

    const [topCatRow] = await runQuery(
      `SELECT cat.Type AS CategoryName,
              COALESCE(SUM(1600 + ((p.Amount * comp.Comm) / 100)), 0) AS Revenue
         FROM application a
         JOIN payment  p    ON a.ApplicationID = p.ApplicationID
         JOIN company  comp ON a.CompanyID     = comp.CompanyID
         JOIN category cat  ON a.CategoryID    = cat.CategoryID
        WHERE a.Status = 'Completed'
        GROUP BY cat.CategoryID, cat.Type
        ORDER BY Revenue DESC
        LIMIT 1`
    );
    const TopCategoryName = topCatRow?.CategoryName ?? null;
    const TopCategoryRevenue = Number(topCatRow?.Revenue ?? 0);

    const [verifiedRow] = await runQuery(
      "SELECT COUNT(*) AS VerifiedCount FROM company WHERE VerficationStatus = 'Verified'"
    );
    const VerifiedCompanies = Number(verifiedRow?.VerifiedCount ?? 0);

    const topCompanies = await runQuery(
      `SELECT comp.CompanyID, comp.Name,
              COUNT(a.ApplicationID) AS CompletedCount,
              COALESCE(SUM(1600 + ((p.Amount * comp.Comm) / 100)), 0) AS Revenue
         FROM company comp
         JOIN application a ON a.CompanyID     = comp.CompanyID
         JOIN payment     p ON p.ApplicationID = a.ApplicationID
        WHERE a.Status = 'Completed'
        GROUP BY comp.CompanyID, comp.Name
        ORDER BY Revenue DESC, CompletedCount DESC
        LIMIT 3`
    );

    const [fulfilledRow] = await runQuery(
      "SELECT COUNT(*) AS Fulfilled FROM application WHERE Status = 'Completed'"
    );
    const FulfilledApplications = Number(fulfilledRow?.Fulfilled ?? 0);

    const pendingCompanies = await runQuery(
      "SELECT CompanyID, Name FROM company WHERE VerficationStatus = 'Pending' ORDER BY CompanyID DESC"
    );

    const tickets = await runQuery(
      "SELECT TicketID, Issue, Resolved FROM supportticket ORDER BY TicketID DESC"
    );
    const TotalTickets = tickets.length;
    const ResolvedTickets = tickets.filter((t) => Number(t.Resolved) === 1).length;
    const UnresolvedTickets = TotalTickets - ResolvedTickets;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Takhlees_Executive_Report.pdf"'
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

    // Header — centered logo + Takhlees wordmark
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

    // Report title
    doc.moveDown(2);
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#000000")
      .text("Takhlees Platform - Executive Report", LEFT, doc.y, {
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

    // Section 1 — Financial overview
    sectionTitle("Financial Overview");
    row("Total Platform Revenue", fmtMoney(TotalWebsiteRevenue));
    row(
      "Top Revenue Category",
      TopCategoryName ? `${TopCategoryName} (${fmtMoney(TopCategoryRevenue)})` : "—"
    );

    // Section 2 — Platform network
    sectionTitle("Platform Network");
    row("Total Verified Companies", String(VerifiedCompanies));
    doc.moveDown(0.3);
    if (!topCompanies.length) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(10)
        .fillColor("#000000")
        .text("No completed business activity yet.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    } else {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#000000")
        .text("Top 3 Companies", LEFT, doc.y, { width: PAGE_WIDTH });
      doc.moveDown(0.2);
      topCompanies.forEach((c, i) => {
        const y = doc.y;
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#000000")
          .text(`${i + 1}. ${c.Name}`, LEFT, y);
        doc
          .font("Helvetica")
          .fillColor("#000000")
          .text(
            `${c.CompletedCount} completed · ${fmtMoney(c.Revenue)}`,
            LEFT,
            y,
            { width: PAGE_WIDTH, align: "right" }
          );
        doc.moveDown(0.3);
      });
    }

    // Section 3 — Operations
    sectionTitle("Operations");
    row("Total Fulfilled Applications", String(FulfilledApplications));

    // Section 4 — Action required
    sectionTitle("Action Required");
    row("Pending Companies", String(pendingCompanies.length));
    if (pendingCompanies.length) {
      doc.moveDown(0.2);
      pendingCompanies.forEach((c) => {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#000000")
          .text(`• ${c.Name}`, LEFT + 10, doc.y, { width: PAGE_WIDTH - 10 });
        doc.moveDown(0.15);
      });
    }

    // Section 5 — Customer support
    sectionTitle("Customer Support");
    if (!tickets.length) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(10)
        .fillColor("#000000")
        .text("No support tickets on record.", LEFT, doc.y, { width: PAGE_WIDTH, align: "center" });
    } else {
      const tableWidth = 450;
      const rowHeight = 25;
      const startX = (doc.page.width - tableWidth) / 2;
      const colSplitX = startX + tableWidth * 0.7; // Issue takes 70%, Status takes 30%
      const cellPadX = 8;
      const paddingY = 8;
      const issueColWidth = colSplitX - startX - cellPadX * 2;
      // Right column text spans the full right cell (no horizontal padding)
      // so `align: 'center'` centers across the cell, not against an offset.
      const rightColX = colSplitX;
      const rightColWidth = startX + tableWidth - colSplitX;

      doc.lineWidth(0.5).strokeColor("#000000");

      const drawRowBorders = (yTop) => {
        // bottom edge of this row
        doc
          .moveTo(startX, yTop + rowHeight)
          .lineTo(startX + tableWidth, yTop + rowHeight)
          .stroke();
        // vertical column separator (full row height)
        doc
          .moveTo(colSplitX, yTop)
          .lineTo(colSplitX, yTop + rowHeight)
          .stroke();
        // left + right outer edges (drawn per-row so the box stays intact across page breaks)
        doc.moveTo(startX, yTop).lineTo(startX, yTop + rowHeight).stroke();
        doc
          .moveTo(startX + tableWidth, yTop)
          .lineTo(startX + tableWidth, yTop + rowHeight)
          .stroke();
      };

      // Header row
      let tableTop = doc.y;
      doc
        .moveTo(startX, tableTop)
        .lineTo(startX + tableWidth, tableTop)
        .stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#000000")
        .text("Issue / Subject", startX + cellPadX, tableTop + paddingY, {
          width: issueColWidth,
          lineBreak: false,
          ellipsis: true,
        })
        .text("Status", rightColX, tableTop + paddingY, {
          width: rightColWidth,
          align: "center",
          lineBreak: false,
          ellipsis: true,
        });
      drawRowBorders(tableTop);

      // Data rows — break to next page when there isn't room for another row
      // plus the footer (~70px from page bottom).
      tickets.forEach((t) => {
        if (doc.y + rowHeight + 70 > doc.page.height) {
          doc.addPage();
        }
        const yTop = doc.y;
        const issueText = String(t.Issue || "—");
        const statusText = `Resolved: ${Number(t.Resolved) === 1 ? "Yes" : "No"}`;

        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#000000")
          .text(issueText, startX + cellPadX, yTop + paddingY, {
            width: issueColWidth,
            lineBreak: false,
            ellipsis: true,
          })
          .text(statusText, rightColX, yTop + paddingY, {
            width: rightColWidth,
            align: "center",
            lineBreak: false,
          });

        drawRowBorders(yTop);
        doc.y = yTop + rowHeight;
      });
    }

    doc.moveDown(1);
    row("Total Tickets", String(TotalTickets));
    row("Total Resolved", String(ResolvedTickets));
    row("Total Unresolved", String(UnresolvedTickets));

    // Footer — pinned safely above the bottom margin
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
    res.destroy(err);
  }
};
