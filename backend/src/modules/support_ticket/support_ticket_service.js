import db from '../../Database/connection.js';

const runQuery = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });

const TICKET_SELECT = `
  SELECT
    t.TicketID, t.Issue, t.Resolved, t.AdminID, t.ClientID,
    CONCAT(au.FirstName, ' ', au.LastName) AS AdminName
  FROM supportticket t
  LEFT JOIN user au ON t.AdminID = au.UserID
`;

/* GET /supportticket/client  (requireAuth)
   Returns all tickets filed by the signed-in client. */
export const listClientTickets = async (req, res, next) => {
    try {
        const ClientID = req.session?.userId;
        if (!ClientID) return res.status(401).json({ ok: false, message: 'Authentication required.' });
        const rows = await runQuery(
            `${TICKET_SELECT} WHERE t.ClientID = ? ORDER BY t.TicketID DESC`,
            [ClientID]
        );
        return res.json({ ok: true, data: rows });
    } catch (err) { return next(err); }
};

/* PUT /supportticket/client?TicketID=  (requireAuth)
   Lets a client edit the Issue text of their own unresolved ticket. */
export const updateClientTicket = async (req, res, next) => {
    try {
        const ClientID = req.session?.userId;
        if (!ClientID) return res.status(401).json({ ok: false, message: 'Authentication required.' });
        const TicketID = Number(req.query.TicketID);
        if (!TicketID) return res.status(400).json({ ok: false, message: 'TicketID is required.' });
        const Issue = String(req.body.Issue ?? '').trim();
        if (!Issue) return res.status(400).json({ ok: false, message: 'Issue text is required.' });

        const rows = await runQuery(
            "SELECT * FROM supportticket WHERE TicketID = ? AND ClientID = ? LIMIT 1",
            [TicketID, ClientID]
        );
        if (!rows.length) return res.status(403).json({ ok: false, message: 'Ticket not found.' });
        if (Number(rows[0].Resolved)) return res.status(400).json({ ok: false, message: 'Resolved tickets cannot be edited.' });

        await runQuery("UPDATE supportticket SET Issue = ? WHERE TicketID = ?", [Issue, TicketID]);
        return res.json({ ok: true, message: 'Ticket updated.' });
    } catch (err) { return next(err); }
};

/* DELETE /supportticket/client/:id  (requireAuth)
   Lets a client delete their own unresolved ticket. */
export const deleteClientTicket = async (req, res, next) => {
    try {
        const ClientID = req.session?.userId;
        if (!ClientID) return res.status(401).json({ ok: false, message: 'Authentication required.' });
        const TicketID = Number(req.params.id);
        if (!TicketID) return res.status(400).json({ ok: false, message: 'Invalid ticket id.' });

        const rows = await runQuery(
            "SELECT * FROM supportticket WHERE TicketID = ? AND ClientID = ? LIMIT 1",
            [TicketID, ClientID]
        );
        if (!rows.length) return res.status(403).json({ ok: false, message: 'Ticket not found.' });
        if (Number(rows[0].Resolved)) return res.status(400).json({ ok: false, message: 'Resolved tickets cannot be deleted.' });

        await runQuery("DELETE FROM supportticket WHERE TicketID = ?", [TicketID]);
        return res.json({ ok: true, message: 'Ticket deleted.' });
    } catch (err) { return next(err); }
};

export const createSupportTicket = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO supportticket (`Issue`,`Resolved`,`AdminID`,`ClientID`) VALUES (?,?,?,?)",
        [req.body.Issue, req.body.Resolved, req.body.AdminID, req.body.ClientID], function (err, result) {
            if (err) throw err;
            res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added " + result.insertId);
        });
};

export const getSupportTicket = (req, res) => {
    const TicketID = req.query.TicketID;
    if (TicketID == '%') {
        db.query("SELECT * FROM supportticket where TicketID LIKE ?", [TicketID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM supportticket where TicketID = ?", [TicketID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteSupportTicket = (req, res) => {
    const TicketID = req.query.TicketID;

    db.query("SELECT TicketID FROM supportticket WHERE TicketID = ?", [TicketID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + TicketID + "] does not exist or has already been deleted."
            });
        }

        // ── Record exists → proceed with DELETE ──────────────────────────────
        db.query("DELETE FROM supportticket WHERE TicketID = ?", [TicketID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + TicketID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + TicketID + "] received");
        });
    });
};

export const searchSupportTicket = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['TicketID', 'Issue', 'Resolved', 'AdminID', 'ClientID'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM supportticket WHERE ${keyword} = ? ORDER BY TicketID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};

export const updateSupportTicket = (req, res) => {
    console.log("PUT Request Received");
    const TicketID = req.query.TicketID;

    db.query("SELECT * FROM supportticket WHERE TicketID = ?", [TicketID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + TicketID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing = result[0];
        const Issue    = req.body.Issue    !== undefined ? req.body.Issue    : existing.Issue;
        const Resolved = req.body.Resolved !== undefined ? req.body.Resolved : existing.Resolved;
        const AdminID  = req.body.AdminID  !== undefined ? req.body.AdminID  : existing.AdminID;
        const ClientID = req.body.ClientID !== undefined ? req.body.ClientID : existing.ClientID;

        db.query(
            "UPDATE supportticket SET `Issue` = ?, `Resolved` = ?, `AdminID` = ?, `ClientID` = ? WHERE TicketID = ?",
            [Issue, Resolved, AdminID, ClientID, TicketID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + TicketID + "] is Updated Successfully" });
                console.log("Record Id [" + TicketID + "] is Updated Successfully");
            }
        );
    });
};