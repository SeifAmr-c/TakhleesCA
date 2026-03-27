import db from '../../Database/connection.js';

export const createCategory = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO category (`Type`) VALUES (?)",
        [req.body.Type], function (err, result) {
            if (err) throw err;
            res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added " + result.insertId);
        });
};

export const getCategory = (req, res) => {
    const CategoryID = req.query.CategoryID;
    if (CategoryID == '%') {
        db.query("SELECT * FROM category where CategoryID LIKE ?", [CategoryID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    } else {
        db.query("SELECT * FROM category where CategoryID = ?", [CategoryID], function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteCategory = (req, res) => {
    const CategoryID = req.query.CategoryID;

    db.query("SELECT CategoryID FROM category WHERE CategoryID = ?", [CategoryID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + CategoryID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM category WHERE CategoryID = ?", [CategoryID], function (err, result) {
            if (err) throw err;
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CategoryID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + CategoryID + "] received");
        });
    });
};

export const updateCategory = (req, res) => {
    console.log("PUT Request Received");
    const CategoryID = req.query.CategoryID;

    db.query("SELECT * FROM category WHERE CategoryID = ?", [CategoryID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + CategoryID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing = result[0];
        const Type     = req.body.Type !== undefined ? req.body.Type : existing.Type;

        db.query(
            "UPDATE category SET `Type` = ? WHERE CategoryID = ?",
            [Type, CategoryID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CategoryID + "] is Updated Successfully" });
                console.log("Record Id [" + CategoryID + "] is Updated Successfully");
            }
        );
    });
};