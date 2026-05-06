import db from '../../Database/connection.js';

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
