import db from '../../Database/connection.js';

export const createDocument = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO document (`DocType`,`UploadDate`,`VerficationStatus`,`ClientID`,`ApplicationID`) VALUES (?,?,?,?,?)",
        [req.body.DocType, req.body.UploadDate, req.body.VerficationStatus, req.body.ClientID, req.body.ApplicationID], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added" + result.insertId);
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
    db.query("DELETE FROM document where DocumentID = ?", [DocumentID], function (err, result) {
        if (err) throw err;
        res.json({ "Status": "OK", "Message": "Record Id [" + DocumentID + "] deleted Successfully" });
        console.log("Delete Request Received for record [" + DocumentID + "] received");
    });
};

export const updateDocument = (req, res) => {
    console.log("PUT Request Received");
    const DocumentID = req.query.DocumentID;
    db.query("UPDATE document SET `VerficationStatus`= ? WHERE DocumentID = " + DocumentID,
        [req.body.VerficationStatus], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Id [" + DocumentID + "] is Updated Successfully" });
            console.log("Record Id [" + DocumentID + "] is Updated Successfully");
        });
};