import db from '../../Database/connection.js';

const allowedPortTypes = ['Air', 'Sea'];

export const createPort = (req, res) => {
    console.log("Post Request Received");
    const { PortName, PortType, EstDate } = req.body;

    if (!PortName || !PortType || !EstDate) {
        return res.status(400).json({
            "Status": "Error",
            "Message": "PortName, PortType, and EstDate are required."
        });
    }
    if (!allowedPortTypes.includes(PortType)) {
        return res.status(400).json({
            "Status": "Error",
            "Message": `Invalid PortType. Allowed: ${allowedPortTypes.join(', ')}`
        });
    }

    db.query(
        "INSERT INTO port (`PortName`, `PortType`, `EstDate`) VALUES (?, ?, ?)",
        [PortName, PortType, EstDate],
        function (err, result) {
            if (err) throw err;
            const insertId = result.insertId;
            res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + insertId });
            console.log("Record Added " + insertId);
        }
    );
};

export const getPort = (req, res) => {
    const PortID = req.query.PortID;

    if (PortID !== undefined && PortID !== '' && PortID !== '%') {
        db.query(
            "SELECT * FROM port WHERE PortID = ?",
            [PortID],
            function (err, result) {
                if (err) throw err;
                res.json(result);
            }
        );
        return;
    }

    db.query("SELECT * FROM port ORDER BY PortID ASC", function (err, result) {
        if (err) throw err;
        res.json(result);
    });
};

/* DELETE /port?PortID=<id>
   Two FKs point at port.PortID:
     - companyport.PortID   (which companies operate at the port)
     - application.PortID   (filed shipments)
   Active applications referencing this port would lose meaningful
   data, so we refuse with 409 when any exist. The companyport rows
   are just per-company associations — safe to clear so the port
   itself can be removed. The whole thing runs in a single
   transaction so a failed cleanup can't half-delete. */
export const deletePort = async (req, res, next) => {
    const PortID = Number(req.query.PortID);
    if (!Number.isInteger(PortID) || PortID < 1) {
        return res.status(400).json({ Status: "Error", Message: "Invalid PortID." });
    }

    const conn = await db.pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existing] = await conn.query(
            "SELECT PortID FROM port WHERE PortID = ? LIMIT 1",
            [PortID]
        );
        if (!existing.length) {
            await conn.rollback();
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${PortID}] does not exist or has already been deleted.`,
            });
        }

        const [appRows] = await conn.query(
            "SELECT COUNT(*) AS n FROM application WHERE PortID = ?",
            [PortID]
        );
        if (Number(appRows?.[0]?.n) > 0) {
            await conn.rollback();
            return res.status(409).json({
                Status: "Error",
                Message: "This port is still used by one or more applications and cannot be deleted.",
            });
        }

        await conn.query("DELETE FROM companyport WHERE PortID = ?", [PortID]);
        await conn.query("DELETE FROM port WHERE PortID = ?", [PortID]);

        await conn.commit();
        return res.status(200).json({
            Status: "OK",
            Message: `Record Id [${PortID}] deleted Successfully`,
        });
    } catch (err) {
        try { await conn.rollback(); } catch { /* ignore */ }
        return next(err);
    } finally {
        conn.release();
    }
};

export const searchPort = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['PortID', 'PortName', 'PortType', 'EstDate'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM port WHERE ${keyword} = ? ORDER BY PortID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};

export const updatePort = (req, res) => {
    console.log("PUT Request Received");
    const PortID = req.query.PortID;

    db.query("SELECT * FROM port WHERE PortID = ?", [PortID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + PortID + "] does not exist or has already been deleted. Update aborted."
            });
        }

        const existing = result[0];
        const PortName = req.body.PortName !== undefined ? req.body.PortName : existing.PortName;
        const PortType = req.body.PortType !== undefined ? req.body.PortType : existing.PortType;
        const EstDate  = req.body.EstDate  !== undefined ? req.body.EstDate  : existing.EstDate;

        if (!allowedPortTypes.includes(PortType)) {
            return res.status(400).json({
                "Status": "Error",
                "Message": `Invalid PortType. Allowed: ${allowedPortTypes.join(', ')}`
            });
        }

        db.query(
            "UPDATE port SET `PortName` = ?, `PortType` = ?, `EstDate` = ? WHERE PortID = ?",
            [PortName, PortType, EstDate, PortID],
            function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + PortID + "] is Updated Successfully" });
                console.log("Record Id [" + PortID + "] is Updated Successfully");
            }
        );
    });
};
