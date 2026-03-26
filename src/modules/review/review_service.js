import db from '../../Database/connection.js';

export const createReview = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO review (`Review`,`Rating`,`ApplicationID`,`CategoryID`) VALUES (?,?,?,?)",
        [req.body.Review, req.body.Rating, req.body.ApplicationID, req.body.CategoryID], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added" + result.insertId);
        });
};

export const getReview = (req, res) => {
    const ReviewID = req.query.ReviewID;
    if (ReviewID == '%') {
        db.query("SELECT * FROM review where ReviewID LIKE ?", [ReviewID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM review where ReviewID = ?", [ReviewID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteReview = (req, res) => {
    const ReviewID = req.query.ReviewID;
    db.query("DELETE FROM review where ReviewID = ?", [ReviewID], function (err, result) {
        if (err) throw err;
        res.json({ "Status": "OK", "Message": "Record Id [" + ReviewID + "] deleted Successfully" });
        console.log("Delete Request Received for record [" + ReviewID + "] received");
    });
};

export const updateReview = (req, res) => {
    console.log("PUT Request Received");
    const ReviewID = req.query.ReviewID;
    db.query("UPDATE review SET `Rating`= ? WHERE ReviewID = " + ReviewID,
        [req.body.Rating], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Id [" + ReviewID + "] is Updated Successfully" });
            console.log("Record Id [" + ReviewID + "] is Updated Successfully");
        });
};