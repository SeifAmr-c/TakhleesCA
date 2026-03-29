import db from '../../Database/connection.js';

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

// ── searchSupportTicket ──────────────────────────────────
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