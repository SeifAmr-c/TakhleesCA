import db from '../../Database/connection.js';

export const createCategory = (req, res) => {
    console.log("Post Request Received");
    db.query("INSERT INTO category (`Type`) VALUES (?)",
        [req.body.Type], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Added Successfully with Id " + result.insertId });
            console.log("Record Added" + result.insertId);
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
    db.query("DELETE FROM category where CategoryID = ?", [CategoryID], function (err, result) {
        if (err) throw err;
        res.json({ "Status": "OK", "Message": "Record Id [" + CategoryID + "] deleted Successfully" });
        console.log("Delete Request Received for record [" + CategoryID + "] received");
    });
};

export const updateCategory = (req, res) => {
    console.log("PUT Request Received");
    const CategoryID = req.query.CategoryID;
    db.query("UPDATE category SET `Type`= ? WHERE CategoryID = " + CategoryID,
        [req.body.Type], function (err, result) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Id [" + CategoryID + "] is Updated Successfully" });
            console.log("Record Id [" + CategoryID + "] is Updated Successfully");
        });
};