import db from '../../Database/connection.js';

export const createCompanyCategory = (req, res) => {
    console.log("Post Request Received");
    const { CompanyID, CategoryID, Price } = req.body;

    if (!CompanyID || !CategoryID) {
        return res.status(400).json({
            "Status": "Error",
            "Message": "CompanyID and CategoryID are required."
        });
    }
    if (Price === undefined || Price === null || isNaN(Number(Price))) {
        return res.status(400).json({
            "Status": "Error",
            "Message": "Price is required and must be a number."
        });
    }

    db.query(
        "SELECT 1 FROM companycategory WHERE CompanyID = ? AND CategoryID = ?",
        [CompanyID, CategoryID],
        function (err, existing) {
            if (err) throw err;
            if (existing.length > 0) {
                return res.status(409).json({
                    "Status": "Error",
                    "Message": `Link between CompanyID [${CompanyID}] and CategoryID [${CategoryID}] already exists.`
                });
            }

            db.query(
                "INSERT INTO companycategory (`CompanyID`, `CategoryID`, `Price`) VALUES (?, ?, ?)",
                [CompanyID, CategoryID, Price],
                function (err) {
                    if (err) throw err;
                    res.status(201).json({
                        "Status": "OK",
                        "Message": `Record Added Successfully (CompanyID=${CompanyID}, CategoryID=${CategoryID})`
                    });
                    console.log(`Record Added (CompanyID=${CompanyID}, CategoryID=${CategoryID})`);
                }
            );
        }
    );
};

export const getCompanyCategory = (req, res) => {
    const { CompanyID, CategoryID } = req.query;

    if (CompanyID && CategoryID) {
        db.query(
            "SELECT * FROM companycategory WHERE CompanyID = ? AND CategoryID = ?",
            [CompanyID, CategoryID],
            function (err, result) {
                if (err) throw err;
                res.json(result);
            }
        );
    } else if (CompanyID) {
        db.query(
            "SELECT cc.*, cat.Type FROM companycategory cc JOIN category cat ON cc.CategoryID = cat.CategoryID WHERE cc.CompanyID = ?",
            [CompanyID],
            function (err, result) {
                if (err) throw err;
                res.json(result);
            }
        );
    } else if (CategoryID) {
        db.query(
            "SELECT cc.*, c.Name AS CompanyName FROM companycategory cc JOIN company c ON cc.CompanyID = c.CompanyID WHERE cc.CategoryID = ?",
            [CategoryID],
            function (err, result) {
                if (err) throw err;
                res.json(result);
            }
        );
    } else {
        db.query("SELECT * FROM companycategory", function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const updateCompanyCategory = (req, res) => {
    console.log("PUT Request Received");
    const { CompanyID, CategoryID } = req.query;

    if (!CompanyID || !CategoryID) {
        return res.status(400).json({
            "Status": "Error",
            "Message": "CompanyID and CategoryID query params are required."
        });
    }

    db.query(
        "SELECT * FROM companycategory WHERE CompanyID = ? AND CategoryID = ?",
        [CompanyID, CategoryID],
        function (err, result) {
            if (err) throw err;
            if (result.length === 0) {
                return res.status(404).json({
                    "Status": "Error",
                    "Message": `Link (CompanyID=${CompanyID}, CategoryID=${CategoryID}) does not exist. Update aborted.`
                });
            }

            const existing = result[0];
            const Price = req.body.Price !== undefined ? req.body.Price : existing.Price;

            db.query(
                "UPDATE companycategory SET `Price` = ? WHERE CompanyID = ? AND CategoryID = ?",
                [Price, CompanyID, CategoryID],
                function (err) {
                    if (err) throw err;
                    res.status(200).json({
                        "Status": "OK",
                        "Message": `Link (CompanyID=${CompanyID}, CategoryID=${CategoryID}) is Updated Successfully`
                    });
                    console.log(`Link (CompanyID=${CompanyID}, CategoryID=${CategoryID}) is Updated Successfully`);
                }
            );
        }
    );
};

export const deleteCompanyCategory = (req, res) => {
    const { CompanyID, CategoryID } = req.query;

    if (!CompanyID || !CategoryID) {
        return res.status(400).json({
            "Status": "Error",
            "Message": "CompanyID and CategoryID query params are required."
        });
    }

    db.query(
        "SELECT 1 FROM companycategory WHERE CompanyID = ? AND CategoryID = ?",
        [CompanyID, CategoryID],
        function (err, result) {
            if (err) throw err;
            if (result.length === 0) {
                return res.status(404).json({
                    "Status": "Error",
                    "Message": `Link (CompanyID=${CompanyID}, CategoryID=${CategoryID}) does not exist or has already been deleted.`
                });
            }

            db.query(
                "DELETE FROM companycategory WHERE CompanyID = ? AND CategoryID = ?",
                [CompanyID, CategoryID],
                function (err) {
                    if (err) throw err;
                    res.status(200).json({
                        "Status": "OK",
                        "Message": `Link (CompanyID=${CompanyID}, CategoryID=${CategoryID}) deleted Successfully`
                    });
                    console.log(`Delete Request Received for link (CompanyID=${CompanyID}, CategoryID=${CategoryID})`);
                }
            );
        }
    );
};

export const searchCompanyCategory = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['CompanyID', 'CategoryID', 'Price'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM companycategory WHERE ${keyword} = ? ORDER BY CompanyID ${sort}, CategoryID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};
