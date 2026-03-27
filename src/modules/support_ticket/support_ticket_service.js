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

        db.query("DELETE FROM supportticket WHERE TicketID = ?", [TicketID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + TicketID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + TicketID + "] received");
        });
    });
};

export const updateSupportTicket = (req, res) => {
    console.log("PUT Request Received");
    const TicketID = req.query.TicketID;

    db.query("SELECT TicketID FROM supportticket WHERE TicketID = ?", [TicketID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + TicketID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        db.query("UPDATE supportticket SET `Resolved` = ? WHERE TicketID = ?",
            [req.body.Resolved, TicketID], function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + TicketID + "] is Updated Successfully" });
                console.log("Record Id [" + TicketID + "] is Updated Successfully");
            });
    });
};