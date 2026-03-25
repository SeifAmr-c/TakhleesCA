import express from 'express';
import db from '../../Database/connection.js';
const PORT = 3000;
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.post('/payment',(req,res)=>{
    console.log("Post Request Received");
    db.query("INSERT INTO payment (`PaymentDate`,`Amount`,`PaymentGateway`,`ApplicationID`) VALUES (?,?,?,?)",
    [req.body.PaymentDate,req.body.Amount,req.body.PaymentGateway,req.body.ApplicationID], function (err, result,
    fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Added Successfully with Id "+
    result.insertId});
    console.log("Record Added"+ result.insertId);
    });
    });


app.get('/payment',(req,res)=>{
const PaymentID= req.query.PaymentID;      
if (PaymentID == '%'){
db.query("SELECT * FROM payment where PaymentID LIKE ?", [PaymentID], function (err, result, fields)
{
if (err) throw err;
res.json(result);
console.log(result);
});
}
else{
db.query("SELECT * FROM payment where PaymentID = ?", [PaymentID], function (err, result, fields) {
if (err) throw err;
res.json(result);
console.log(result);
});
}
});

app.delete('/payment',(req,res)=>{
    const PaymentID = req.query.PaymentID;
    db.query("DELETE FROM payment where PaymentID = ?", [PaymentID], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message" : "Record Id ["+req.query.PaymentID+"] deleted Successfully"});
    console.log("Delete Request Received for record ["+req.query.PaymentID+"] received");
    });
    });

app.put('/payment',(req,res)=>{
    console.log("PUT Request Received");
    const PaymentID= req.query.PaymentID;
    db.query("UPDATE payment SET `Amount`= ? WHERE PaymentID = " + PaymentID ,
    [req.body.Amount], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Id ["+ PaymentID + "] is Updated Successfully"});
    console.log("Record Id ["+ PaymentID+ "] is Updated Successfully");
    });
    });
        

app.listen(PORT,
()=> console.log (`your server is up and run on http://localhost:${PORT}`)
);