import db from '../../Database/connection.js';

export const createCompanyPort = (req, res) => {
    console.log("Post Request Received");
    const { CompanyID, PortID } = req.body;

    if (!CompanyID || !PortID) {
        return res.status(400).json({
            "Status": "Error",
            "Message": "CompanyID and PortID are required."
        });
    }

    db.query(
        "SELECT 1 FROM companyport WHERE CompanyID = ? AND PortID = ?",
        [CompanyID, PortID],
        function (err, existing) {
            if (err) throw err;
            if (existing.length > 0) {
                return res.status(409).json({
                    "Status": "Error",
                    "Message": `Link between CompanyID [${CompanyID}] and PortID [${PortID}] already exists.`
                });
            }

            db.query(
                "INSERT INTO companyport (`CompanyID`, `PortID`) VALUES (?, ?)",
                [CompanyID, PortID],
                function (err) {
                    if (err) throw err;
                    res.status(201).json({
                        "Status": "OK",
                        "Message": `Record Added Successfully (CompanyID=${CompanyID}, PortID=${PortID})`
                    });
                    console.log(`Record Added (CompanyID=${CompanyID}, PortID=${PortID})`);
                }
            );
        }
    );
};

export const getCompanyPort = (req, res) => {
    const { CompanyID, PortID } = req.query;

    if (CompanyID && PortID) {
        db.query(
            "SELECT * FROM companyport WHERE CompanyID = ? AND PortID = ?",
            [CompanyID, PortID],
            function (err, result) {
                if (err) throw err;
                res.json(result);
            }
        );
    } else if (CompanyID) {
        db.query(
            "SELECT cp.*, p.PortName, p.PortType, p.EstDate FROM companyport cp JOIN port p ON cp.PortID = p.PortID WHERE cp.CompanyID = ?",
            [CompanyID],
            function (err, result) {
                if (err) throw err;
                res.json(result);
            }
        );
    } else if (PortID) {
        db.query(
            "SELECT cp.*, c.Name AS CompanyName FROM companyport cp JOIN company c ON cp.CompanyID = c.CompanyID WHERE cp.PortID = ?",
            [PortID],
            function (err, result) {
                if (err) throw err;
                res.json(result);
            }
        );
    } else {
        db.query("SELECT * FROM companyport", function (err, result) {
            if (err) throw err;
            res.json(result);
        });
    }
};

export const deleteCompanyPort = (req, res) => {
    const { CompanyID, PortID } = req.query;

    if (!CompanyID || !PortID) {
        return res.status(400).json({
            "Status": "Error",
            "Message": "CompanyID and PortID query params are required."
        });
    }

    db.query(
        "SELECT 1 FROM companyport WHERE CompanyID = ? AND PortID = ?",
        [CompanyID, PortID],
        function (err, result) {
            if (err) throw err;
            if (result.length === 0) {
                return res.status(404).json({
                    "Status": "Error",
                    "Message": `Link (CompanyID=${CompanyID}, PortID=${PortID}) does not exist or has already been deleted.`
                });
            }

            db.query(
                "DELETE FROM companyport WHERE CompanyID = ? AND PortID = ?",
                [CompanyID, PortID],
                function (err) {
                    if (err) throw err;
                    res.status(200).json({
                        "Status": "OK",
                        "Message": `Link (CompanyID=${CompanyID}, PortID=${PortID}) deleted Successfully`
                    });
                    console.log(`Delete Request Received for link (CompanyID=${CompanyID}, PortID=${PortID})`);
                }
            );
        }
    );
};

export const searchCompanyPort = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['CompanyID', 'PortID'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM companyport WHERE ${keyword} = ? ORDER BY CompanyID ${sort}, PortID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};
