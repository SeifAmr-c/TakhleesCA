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
    let user_id = req.query.UserID ?? req.query.userId ?? req.query.id ?? req.query.user_id;
    if (!user_id) user_id = '%';

    const sql = user_id === '%'
        ? 'SELECT * FROM (User LEFT JOIN Client ON User.UserID = Client.ClientID) LEFT JOIN Admin ON User.UserID = Admin.AdminID WHERE User.UserID LIKE ?'
        : 'SELECT * FROM (User LEFT JOIN Client ON User.UserID = Client.ClientID) LEFT JOIN Admin ON User.UserID = Admin.AdminID WHERE User.UserID = ?';

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

    if (type === 'C') {
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
            res.json({ Status: 'OK', Message: 'Record Added Successfully with Id ' + userResult.insertId });
        });
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
            res.json({ Status: 'OK', Message: 'Record Added Successfully with Id ' + userResult.insertId });
        });
    } else {
        res.status(400).json({ error: 'Invalid type. Use "C" for Client or "A" for Admin' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is up and running on http://localhost:${PORT}`);
});
