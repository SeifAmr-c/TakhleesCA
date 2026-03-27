import db from '../../Database/connection.js';

export const createDocument = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO document (`DocType`,`UploadDate`,`VerficationStatus`,`ClientID`,`ApplicationID`) VALUES (?,?,?,?,?)",
        [req.body.DocType, req.body.UploadDate, req.body.VerficationStatus, req.body.ClientID, req.body.ApplicationID], function (err, result) {
            if (err) throw err;
            res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added " + result.insertId);
        });
};

export const getDocument = (req, res) => {
    const DocumentID = req.query.DocumentID;
    if (DocumentID == '%') {
        db.query("SELECT * FROM document where DocumentID LIKE ?", [DocumentID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM document where DocumentID = ?", [DocumentID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteDocument = (req, res) => {
    const DocumentID = req.query.DocumentID;

    db.query("SELECT DocumentID FROM document WHERE DocumentID = ?", [DocumentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + DocumentID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM document WHERE DocumentID = ?", [DocumentID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + DocumentID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + DocumentID + "] received");
        });
    });
};

export const updateDocument = (req, res) => {
    console.log("PUT Request Received");
    const DocumentID = req.query.DocumentID;

    db.query("SELECT DocumentID FROM document WHERE DocumentID = ?", [DocumentID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + DocumentID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        db.query("UPDATE document SET `VerficationStatus` = ? WHERE DocumentID = ?",
            [req.body.VerficationStatus, DocumentID], function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + DocumentID + "] is Updated Successfully" });
                console.log("Record Id [" + DocumentID + "] is Updated Successfully");
            });
    });
};