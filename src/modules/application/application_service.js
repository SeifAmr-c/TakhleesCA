import express from 'express';
import db from '../../Database/connection.js';
const PORT = 3000;
const app = express();
app.use(express.json());



app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.post('/application', (req, res) => {
    console.log("Post Request Received");

    db.query(
        "SELECT ApplicationID FROM application WHERE TrackingNumber = ?",
        [req.body.TrackingNumber],
        function (err, result) {
            if (err) throw err;

            if (result.length > 0) {
                return res.status(409).json({
                    "Status": "Error",
                    "Message": "Tracking Number [" + req.body.TrackingNumber + "] already exists. Please use a unique Tracking Number."
                });
            }

            db.query(
                "INSERT INTO application (`PaymentType`,`CompletionDate`,`SubmissionDate`,`TrackingNumber`,`Status`,`DeliveryAddress`,`CompanyEmployeeID`,`CategoryID`) VALUES (?,?,?,?,?,?,?,?)",
                [req.body.PaymentType, req.body.CompletionDate, req.body.SubmissionDate, req.body.TrackingNumber, req.body.Status, req.body.DeliveryAddress, req.body.CompanyEmployeeID, req.body.CategoryID],
                function (err, result) {
                    if (err) throw err;
                    res.status(201).json({
                        "Status": "OK",
                        "Message": "Record Added Successfully with Id " + result.insertId
                    });
                    console.log("Record Added " + result.insertId);
                }
            );
        }
    );
});

app.get('/application', (req, res) => {
    const ApplicationID = req.query.ApplicationID;
    if (ApplicationID == '%') {
        db.query("SELECT * FROM application where ApplicationID LIKE ?", [ApplicationID], function (err, result, fields) {
            if (err) throw err;
            res.json(result);
            console.log(result);
        });
    } else {
        db.query("SELECT * FROM application where ApplicationID = ?", [ApplicationID], function (err, result, fields) {
            if (err) throw err;
            res.json(result);
            console.log(result);
        });
    }
});

app.delete('/application', (req, res) => {
    const ApplicationID = req.query.ApplicationID;

    // ── Validation: Check if the record exists before deleting ──────────────
    db.query(
        "SELECT ApplicationID FROM application WHERE ApplicationID = ?",
        [ApplicationID],
        function (err, result) {
            if (err) throw err;

            if (result.length === 0) {
                return res.status(404).json({
                    "Status": "Error",
                    "Message": "Record Id [" + ApplicationID + "] does not exist or has already been deleted."
                });
            }

            db.query("DELETE FROM application WHERE ApplicationID = ?", [ApplicationID], function (err, result) {
                if (err) throw err;
                res.status(200).json({ "Status": "OK", "Message": "Record Id [" + ApplicationID + "] deleted Successfully" });
                console.log("Delete Request Received for record [" + ApplicationID + "] received");
            });
        }
    );
});

app.put('/application', (req, res) => {
    console.log("PUT Request Received");
    const ApplicationID = req.query.ApplicationID;
    db.query("UPDATE application SET `Status`= ? WHERE ApplicationID = " + ApplicationID,
        [req.body.Status], function (err, result, fields) {
            if (err) throw err;
            res.json({ "Status": "OK", "Message": "Record Id [" + ApplicationID + "] is Updated Successfully" });
            console.log("Record Id [" + ApplicationID + "] is Updated Successfully");
        });
});


app.listen(PORT,
    () => console.log(`your server is up and run on http://localhost:${PORT}`)
);