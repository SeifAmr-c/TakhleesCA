import express from 'express';
import db from '../../Database/connection.js';
const PORT = 3000;
const app = express();
app.use(express.json());



app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.post('/companyemployee', (req, res) => {
    console.log("Post Request Received");

    db.query(
        "SELECT EmployeeID FROM companyemployee WHERE Email = ?",
        [req.body.Email],
        function (err, emailResult) {
            if (err) throw err;

            if (emailResult.length > 0) {
                return res.status(409).json({
                    "Status": "Error",
                    "Message": "Email [" + req.body.Email + "] already exists. Please use a unique Email."
                });
            }

            db.query(
                "SELECT EmployeeID FROM companyemployee WHERE Phone = ?",
                [req.body.Phone],
                function (err, phoneResult) {
                    if (err) throw err;

                    if (phoneResult.length > 0) {
                        return res.status(409).json({
                            "Status": "Error",
                            "Message": "Phone [" + req.body.Phone + "] already exists. Please use a unique Phone Number."
                        });
                    }

                    db.query(
                        "INSERT INTO companyemployee (`Email`,`FirstName`,`LastName`,`Phone`,`CompanyID`) VALUES (?,?,?,?,?)",
                        [req.body.Email, req.body.FirstName, req.body.LastName, req.body.Phone, req.body.CompanyID],
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
        }
    );
});

app.get('/companyemployee', (req, res) => {
    const EmployeeID = req.query.EmployeeID;
    if (EmployeeID == '%') {
        db.query("SELECT * FROM companyemployee where EmployeeID LIKE ?", [EmployeeID], function (err, result, fields) {
            if (err) throw err;
            res.json(result);
            console.log(result);
        });
    } else {
        db.query("SELECT * FROM companyemployee where EmployeeID = ?", [EmployeeID], function (err, result, fields) {
            if (err) throw err;
            res.json(result);
            console.log(result);
        });
    }
});

app.delete('/companyemployee', (req, res) => {
    const EmployeeID = req.query.EmployeeID;

    db.query(
        "SELECT EmployeeID FROM companyemployee WHERE EmployeeID = ?",
        [EmployeeID],
        function (err, result) {
            if (err) throw err;

            if (result.length === 0) {
                return res.status(404).json({
                    "Status": "Error",
                    "Message": "Record Id [" + EmployeeID + "] does not exist or has already been deleted."
                });
            }

            db.query("DELETE FROM companyemployee WHERE EmployeeID = ?", [EmployeeID], function (err, result) {
                if (err) throw err;
                res.status(200).json({
                    "Status": "OK",
                    "Message": "Record Id [" + EmployeeID + "] deleted Successfully"
                });
                console.log("Delete Request Received for record [" + EmployeeID + "] received");
            });
        }
    );
});

app.put('/companyemployee', (req, res) => {
    console.log("PUT Request Received");
    const EmployeeID = req.query.EmployeeID;
    db.query("UPDATE companyemployee SET `FirstName`= ? WHERE EmployeeID = " + EmployeeID,
        [req.body.FirstName], function (err, result, fields) {
            if (err) throw err;
            res.json({
                "Status": "OK",
                "Message": "Record Id [" + EmployeeID + "] is Updated Successfully"
            });
            console.log("Record Id [" + EmployeeID + "] is Updated Successfully");
        });
});


app.listen(PORT,
    () => console.log(`your server is up and run on http://localhost:${PORT}`)
);