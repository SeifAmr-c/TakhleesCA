import express from 'express';
import db from '../../Database/connection.js';

const PORT = 3000;
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.get('/User', (req, res) => {
    const raw = req.query.UserID;

    let user_id;
    if (raw === undefined || raw === null || raw === '') {
        user_id = '%';
    } else if (raw === '%') {
        user_id = '%';
    } else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1) {
            return res.status(400).json({
                error: 'Invalid UserID. Use a positive integer or %.',
            });
        }
        user_id = String(n);
    }

    const sql =
        'SELECT * FROM (User LEFT JOIN Client ON User.UserID = Client.ClientID) LEFT JOIN Admin ON User.UserID = Admin.AdminID WHERE User.UserID LIKE ?';

    db.query(sql, [user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
});

app.post('/User', (req, res) => {
    console.log('Post Request Received');
    const type = req.body.Type;

    db.query(
        "SELECT UserID FROM User WHERE Email = ?",
        [req.body.Email],
        function (err, emailResult) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }

            if (emailResult.length > 0) {
                return res.status(409).json({
                    "Status": "Error",
                    "Message": "Email [" + req.body.Email + "] already exists. Please use a unique Email."
                });
            }

            if (type === 'C') {

                db.query(
                    "SELECT ClientID FROM Client WHERE PhoneNumber = ?",
                    [req.body.PhoneNumber],
                    function (err, phoneResult) {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: 'Database error', details: err.message });
                        }

                        if (phoneResult.length > 0) {
                            return res.status(409).json({
                                "Status": "Error",
                                "Message": "Phone Number [" + req.body.PhoneNumber + "] already exists. Please use a unique Phone Number."
                            });
                        }

                        db.query(
                            "SELECT ClientID FROM Client WHERE NationalID = ?",
                            [req.body.NationalID],
                            function (err, nidResult) {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).json({ error: 'Database error', details: err.message });
                                }

                                if (nidResult.length > 0) {
                                    return res.status(409).json({
                                        "Status": "Error",
                                        "Message": "National ID [" + req.body.NationalID + "] already exists. Please use a unique National ID."
                                    });
                                }

                                const sql = `
                                    INSERT INTO User (FirstName, LastName, Email, Password, Type) VALUES (?,?,?,?,?);
                                    INSERT INTO Client (ClientID, PhoneNumber, NationalID, Address) VALUES ((SELECT UserID FROM User WHERE Email = ?),?,?,?)
                                `;
                                const params = [req.body.FirstName, req.body.LastName, req.body.Email, req.body.Password, req.body.Type, req.body.Email, req.body.PhoneNumber, req.body.NationalID, req.body.Address];
                                db.query(sql, params, (err, results) => {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).json({ error: 'Database error', details: err.message });
                                    }
                                    const userResult = Array.isArray(results) ? results[0] : results;
                                    res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + userResult.insertId });
                                });
                            }
                        );
                    }
                );

            } else if (type === 'A') {

                const sql = `
                    INSERT INTO User (FirstName, LastName, Email, Password, Type) VALUES (?,?,?,?,?);
                    INSERT INTO Admin (AdminID, LastLogin) VALUES ((SELECT UserID FROM User WHERE Email = ?), NOW())
                `;
                const params = [req.body.FirstName, req.body.LastName, req.body.Email, req.body.Password, req.body.Type, req.body.Email];
                db.query(sql, params, (err, results) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Database error', details: err.message });
                    }
                    const userResult = Array.isArray(results) ? results[0] : results;
                    res.status(201).json({ "Status": "OK", "Message": "Record Added Successfully with Id " + userResult.insertId });
                });

            } else {
                res.status(400).json({ error: 'Invalid type. Use "C" for Client or "A" for Admin' });
            }
        }
    );
});

app.delete('/users', (req, res) => {
    const UserID = req.query.UserID;
    if (UserID === undefined || UserID === null || String(UserID).trim() === '') {
        return res.status(400).json({ error: 'UserID is required (query)' });
    }
    const uid = Number(UserID);
    if (!Number.isFinite(uid)) {
        return res.status(400).json({ error: 'Invalid UserID' });
    }

    db.query(
        "SELECT UserID FROM User WHERE UserID = ?",
        [uid],
        function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }

            if (result.length === 0) {
                return res.status(404).json({
                    "Status": "Error",
                    "Message": "Record Id [" + uid + "] does not exist or has already been deleted."
                });
            }

            const sql = `
                DELETE FROM Client WHERE ClientID = ?;
                DELETE FROM Admin WHERE AdminID = ?;
                DELETE FROM User WHERE UserID = ?
            `;
            db.query(sql, [uid, uid, uid], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                res.status(200).json({ "Status": "OK", "Message": "UserID [" + uid + "] deleted successfully" });
                console.log("Delete request processed for UserID [" + uid + "]");
            });
        }
    );
});

app.put('/users', (req, res) => {
    console.log('PUT Request Received');
    const UserID = req.query.UserID;
    if (UserID === undefined || UserID === null || String(UserID).trim() === '') {
        return res.status(400).json({ error: 'UserID is required (query)' });
    }
    const uid = Number(UserID);
    if (!Number.isFinite(uid) || !Number.isInteger(uid) || uid < 1) {
        return res.status(400).json({ error: 'Invalid UserID' });
    }
    const { FirstName, LastName, Email, Password, Type } = req.body;
    const sql =
        'UPDATE User SET FirstName = ?, LastName = ?, Email = ?, Password = ?, Type = ? WHERE UserID = ?';
    db.query(sql, [FirstName, LastName, Email, Password, Type, uid], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found', UserID: uid });
        }
        res.json({ Status: 'OK', Message: `UserID [${uid}] updated successfully` });
        console.log(`UserID [${uid}] updated successfully`);
    });
});

app.put('/Client', (req, res) => {
    const raw = req.query.ClientID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return res.status(400).json({ error: 'ClientID is required (query)' });
    }
    const clientId = Number(raw);
    if (!Number.isInteger(clientId) || clientId < 1) {
        return res.status(400).json({ error: 'Invalid ClientID' });
    }

    const { PhoneNumber, NationalID, Address } = req.body;
    const phoneDigits = String(PhoneNumber ?? '').replace(/\D/g, '');
    const nidDigits = String(NationalID ?? '').replace(/\D/g, '');
    const phone = parseInt(phoneDigits, 10);
    const nid = parseInt(nidDigits, 10);
    const address = String(Address ?? '').trim();

    if (!Number.isFinite(phone)) {
        return res.status(400).json({ error: 'Invalid PhoneNumber' });
    }
    if (!Number.isFinite(nid)) {
        return res.status(400).json({ error: 'Invalid NationalID' });
    }
    if (!address) {
        return res.status(400).json({ error: 'Address is required' });
    }

    const sql =
        'UPDATE Client SET PhoneNumber = ?, NationalID = ?, Address = ? WHERE ClientID = ?';
    db.query(sql, [phone, nid, address, clientId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found', ClientID: clientId });
        }
        res.json({ Status: 'OK', Message: `ClientID [${clientId}] updated successfully` });
    });
});

app.put('/Admin', (req, res) => {
    const raw = req.query.AdminID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return res.status(400).json({ error: 'AdminID is required (query)' });
    }
    const adminId = Number(raw);
    if (!Number.isInteger(adminId) || adminId < 1) {
        return res.status(400).json({ error: 'Invalid AdminID' });
    }

    const sql =
        req.body.LastLogin != null
            ? 'UPDATE Admin SET LastLogin = ? WHERE AdminID = ?'
            : 'UPDATE Admin SET LastLogin = NOW() WHERE AdminID = ?';
    const params =
        req.body.LastLogin != null ? [req.body.LastLogin, adminId] : [adminId];
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Admin not found', AdminID: adminId });
        }
        res.json({ Status: 'OK', Message: `AdminID [${adminId}] updated successfully` });
    });
});

app.listen(PORT, () => {
    console.log(`Server is up and running on http://localhost:${PORT}`);
});