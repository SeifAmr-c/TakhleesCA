import db from '../../Database/connection.js';
import Category from '../../Database/mongo/category.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';
import { mirror } from '../../Database/mongo/dual_write.js';

export const createCategory = (req, res) => {
    console.log("Post Request Received");
    const { Type } = req.body;
    db.query("INSERT INTO category (`Type`) VALUES (?)",
        [Type], function (err, result) {
            if (err) throw err;
            const insertId = result.insertId;
            mirror(`category.create mysqlCategoryId=${insertId}`, () =>
                Category.create({ mysqlCategoryId: insertId, Type })
            );
            res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + insertId });
            console.log("Record Added " + insertId);
        });
};

export const getCategory = (req, res) => {
    const CategoryID = req.query.CategoryID;

    if (CategoryID !== undefined && CategoryID !== '' && CategoryID !== '%') {
        db.query(
            "SELECT * FROM category WHERE CategoryID = ?",
            [CategoryID],
            function (err, result) {
                if (err) throw err;
                res.json(result);
            }
        );
        return;
    }

    db.query("SELECT * FROM category ORDER BY CategoryID ASC", function (err, result) {
        if (err) throw err;
        res.json(result);
    });
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
            mirror(`category.delete mysqlCategoryId=${CategoryID}`, () =>
                Category.deleteOne({ mysqlCategoryId: Number(CategoryID) })
            );
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CategoryID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + CategoryID + "] received");
        });
    });
};

export const searchCategory = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['CategoryID', 'Type'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM category WHERE ${keyword} = ? ORDER BY CategoryID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
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
                mirror(`category.update mysqlCategoryId=${CategoryID}`, async () => {
                    await Category.updateOne(
                        { mysqlCategoryId: Number(CategoryID) },
                        { $set: { Type }, $setOnInsert: { mysqlCategoryId: Number(CategoryID) } },
                        { upsert: true }
                    );
                    await Company.updateMany(
                        { 'categories.mysqlCategoryId': Number(CategoryID) },
                        { $set: { 'categories.$.Type': Type } }
                    );
                    await Application.updateMany(
                        { mysqlCategoryId: Number(CategoryID) },
                        { $set: { 'category.Type': Type } }
                    );
                });
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CategoryID + "] is Updated Successfully" });
                console.log("Record Id [" + CategoryID + "] is Updated Successfully");
            }
        );
    });
};