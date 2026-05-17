import db from '../../Database/connection.js';

export const getReviewAverages = (req, res) => {
    db.query(
        `SELECT a.CompanyID,
                ROUND(AVG(r.Rating), 1) AS AverageRating,
                COUNT(r.ReviewID) AS ReviewCount
         FROM review r
         JOIN application a ON r.ApplicationID = a.ApplicationID
         GROUP BY a.CompanyID`,
        function (err, result) {
            if (err) throw err;
            res.json(result);
        }
    );
};

export const getClientReviewedApplications = (req, res) => {
    const { ClientID } = req.query;
    if (!ClientID) {
        return res.status(400).json({ error: 'ClientID is required' });
    }
    db.query(
        `SELECT r.ApplicationID
         FROM review r
         JOIN application a ON r.ApplicationID = a.ApplicationID
         WHERE a.ClientID = ?`,
        [ClientID],
        function (err, result) {
            if (err) throw err;
            res.json(result);
        }
    );
};

export const getCompanyReviews = (req, res) => {
    const { CompanyID, rating, text } = req.query;
    if (!CompanyID) {
        return res.status(400).json({ error: 'CompanyID is required' });
    }

    const params = [CompanyID];
    let filters = '';

    if (rating !== undefined) {
        filters += ' AND r.Rating = ?';
        params.push(Number(rating));
    }
    if (text) {
        filters += ' AND r.Review LIKE ?';
        params.push(`%${text}%`);
    }

    db.query(
        'SELECT r.ReviewID, r.Review, r.Rating, r.ApplicationID, a.CategoryID,' +
        ' u.FirstName, u.LastName' +
        ' FROM review r' +
        ' JOIN application a ON r.ApplicationID = a.ApplicationID' +
        ' JOIN `user` u ON a.ClientID = u.UserID' +
        ' WHERE a.CompanyID = ?' + filters +
        ' ORDER BY r.ReviewID DESC',
        params,
        function (err, result) {
            if (err) throw err;
            res.json(result);
        }
    );
};

export const createReview = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO review (`Review`,`Rating`,`ApplicationID`) VALUES (?,?,?)",
        [req.body.Review, req.body.Rating, req.body.ApplicationID], function (err, result) {
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

export const searchReview = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['ReviewID', 'Rating', 'ApplicationID'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM review WHERE ${keyword} = ? ORDER BY ReviewID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
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

        db.query(
            "UPDATE review SET `Review` = ?, `Rating` = ?, `ApplicationID` = ? WHERE ReviewID = ?",
            [Review, Rating, ApplicationID, ReviewID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + ReviewID + "] is Updated Successfully" });
                console.log("Record Id [" + ReviewID + "] is Updated Successfully");
            }
        );
    });
};

// Client-owned: only allows editing Review text and Rating; verifies session ownership
export const updateClientReview = (req, res, next) => {
    const ReviewID = req.query.ReviewID;
    const ClientID = req.session.userId;

    db.query(
        `SELECT r.ReviewID, r.Review, r.Rating
         FROM review r
         JOIN application a ON r.ApplicationID = a.ApplicationID
         WHERE r.ReviewID = ? AND a.ClientID = ?`,
        [ReviewID, ClientID],
        function (err, result) {
            if (err) return next(err);
            if (result.length === 0) {
                return res.status(404).json({ error: 'Review not found or you do not own it.' });
            }
            const existing = result[0];
            const Review = req.body.Review !== undefined ? req.body.Review : existing.Review;
            const Rating = req.body.Rating !== undefined ? req.body.Rating : existing.Rating;

            db.query(
                "UPDATE review SET `Review` = ?, `Rating` = ? WHERE ReviewID = ?",
                [Review, Rating, ReviewID],
                function (err) {
                    if (err) return next(err);
                    res.status(200).json({ Status: 'OK', Message: `Review ${ReviewID} updated.` });
                }
            );
        }
    );
};

// Client-owned: verifies session ownership before deleting
export const deleteClientReview = (req, res, next) => {
    const ReviewID = req.query.ReviewID;
    const ClientID = req.session.userId;

    db.query(
        `SELECT r.ReviewID
         FROM review r
         JOIN application a ON r.ApplicationID = a.ApplicationID
         WHERE r.ReviewID = ? AND a.ClientID = ?`,
        [ReviewID, ClientID],
        function (err, result) {
            if (err) return next(err);
            if (result.length === 0) {
                return res.status(404).json({ error: 'Review not found or you do not own it.' });
            }
            db.query("DELETE FROM review WHERE ReviewID = ?", [ReviewID], function (err) {
                if (err) return next(err);
                res.status(200).json({ Status: 'OK', Message: `Review ${ReviewID} deleted.` });
            });
        }
    );
};
