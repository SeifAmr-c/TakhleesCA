import db from '../../Database/connection.js';

export const createCategory = (req, res) => {
    console.log("Post Request Received");
    const { Type } = req.body;
    db.query("INSERT INTO category (`Type`) VALUES (?)",
        [Type], function (err, result) {
            if (err) throw err;
            const insertId = result.insertId;
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

/* DELETE /category?CategoryID=<id>
   Two FKs point at category.CategoryID:
     - companycategory.CategoryID  (per-company pricing rows)
     - application.CategoryID      (filed shipments)
   Active applications referencing this category would lose meaningful
   data if we cascaded, so we refuse with 409 when any exist. The
   companycategory rows are just per-company price quotes — safe to
   clear so the category itself can be removed. The whole thing runs
   in a single transaction so a failed cleanup can't half-delete. */
export const deleteCategory = async (req, res, next) => {
    const CategoryID = Number(req.query.CategoryID);
    if (!Number.isInteger(CategoryID) || CategoryID < 1) {
        return res.status(400).json({ Status: "Error", Message: "Invalid CategoryID." });
    }

    const conn = await db.pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existing] = await conn.query(
            "SELECT CategoryID FROM category WHERE CategoryID = ? LIMIT 1",
            [CategoryID]
        );
        if (!existing.length) {
            await conn.rollback();
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${CategoryID}] does not exist or has already been deleted.`,
            });
        }

        const [appRows] = await conn.query(
            "SELECT COUNT(*) AS n FROM application WHERE CategoryID = ?",
            [CategoryID]
        );
        if (Number(appRows?.[0]?.n) > 0) {
            await conn.rollback();
            return res.status(409).json({
                Status: "Error",
                Message: "This category is still used by one or more applications and cannot be deleted.",
            });
        }

        await conn.query("DELETE FROM companycategory WHERE CategoryID = ?", [CategoryID]);
        await conn.query("DELETE FROM category WHERE CategoryID = ?", [CategoryID]);

        await conn.commit();
        return res.status(200).json({
            Status: "OK",
            Message: `Record Id [${CategoryID}] deleted Successfully`,
        });
    } catch (err) {
        try { await conn.rollback(); } catch { /* ignore */ }
        return next(err);
    } finally {
        conn.release();
    }
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
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + CategoryID + "] is Updated Successfully" });
                console.log("Record Id [" + CategoryID + "] is Updated Successfully");
            }
        );
    });
};