import db from '../../Database/connection.js';

export const createReview = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO review (`Review`,`Rating`,`ApplicationID`,`CategoryID`) VALUES (?,?,?,?)",
        [req.body.Review, req.body.Rating, req.body.ApplicationID, req.body.CategoryID], function (err, result) {
            if (err) throw err;
            res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added " + result.insertId);
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

    db.query("SELECT ReviewID FROM review WHERE ReviewID = ?", [ReviewID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + ReviewID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM review WHERE ReviewID = ?", [ReviewID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + ReviewID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + ReviewID + "] received");
        });
    });
};

export const updateReview = (req, res) => {
    console.log("PUT Request Received");
    const ReviewID = req.query.ReviewID;

    db.query("SELECT * FROM review WHERE ReviewID = ?", [ReviewID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + ReviewID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing      = result[0];
        const Review        = req.body.Review        !== undefined ? req.body.Review        : existing.Review;
        const Rating        = req.body.Rating        !== undefined ? req.body.Rating        : existing.Rating;
        const ApplicationID = req.body.ApplicationID !== undefined ? req.body.ApplicationID : existing.ApplicationID;
        const CategoryID    = req.body.CategoryID    !== undefined ? req.body.CategoryID    : existing.CategoryID;

        db.query(
            "UPDATE review SET `Review` = ?, `Rating` = ?, `ApplicationID` = ?, `CategoryID` = ? WHERE ReviewID = ?",
            [Review, Rating, ApplicationID, CategoryID, ReviewID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + ReviewID + "] is Updated Successfully" });
                console.log("Record Id [" + ReviewID + "] is Updated Successfully");
            }
        );
    });
};