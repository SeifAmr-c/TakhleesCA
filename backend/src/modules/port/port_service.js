import db from '../../Database/connection.js';
import Port from '../../Database/mongo/port.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';
import { mirror } from '../../Database/mongo/dual_write.js';

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
            mirror(`port.create mysqlPortId=${insertId}`, () =>
                Port.create({ mysqlPortId: insertId, PortName, PortType, EstDate })
            );
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

export const deletePort = (req, res) => {
    const PortID = req.query.PortID;

    db.query("SELECT PortID FROM port WHERE PortID = ?", [PortID], function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).json({
                "Status": "Error",
                "Message": "Record Id [" + PortID + "] does not exist or has already been deleted."
            });
        }

        db.query("DELETE FROM port WHERE PortID = ?", [PortID], function (err, result) {
            if (err) throw err;
            mirror(`port.delete mysqlPortId=${PortID}`, () =>
                Port.deleteOne({ mysqlPortId: Number(PortID) })
            );
            res.status(200).json({ "Status": "OK", "Message": "Record Id [" + PortID + "] deleted Successfully" });
            console.log("Delete Request Received for record [" + PortID + "] received");
        });
    });
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
                mirror(`port.update mysqlPortId=${PortID}`, async () => {
                    await Port.updateOne(
                        { mysqlPortId: Number(PortID) },
                        { $set: { PortName, PortType, EstDate }, $setOnInsert: { mysqlPortId: Number(PortID) } },
                        { upsert: true }
                    );
                    /* Fan-out: refresh snapshots inside Company.ports[] and
                       every Application that pinned this port. */
                    await Company.updateMany(
                        { 'ports.mysqlPortId': Number(PortID) },
                        { $set: {
                            'ports.$.PortName': PortName,
                            'ports.$.PortType': PortType,
                        } }
                    );
                    await Application.updateMany(
                        { mysqlPortId: Number(PortID) },
                        { $set: { 'port.PortName': PortName, 'port.PortType': PortType } }
                    );
                });
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + PortID + "] is Updated Successfully" });
                console.log("Record Id [" + PortID + "] is Updated Successfully");
            }
        );
    });
};
