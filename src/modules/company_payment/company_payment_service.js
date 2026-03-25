import express from 'express';
import db from '../../Database/connection.js';
const PORT = 3000;
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.post('/companypayment',(req,res)=>{
    console.log("Post Request Received");
    db.query("INSERT INTO companypayment (`PaymentDate`,`Amount`,`CompanyID`,`PaymentID`) VALUES (?,?,?,?)",
    [req.body.PaymentDate,req.body.Amount,req.body.CompanyID,req.body.PaymentID], function (err, result,
    fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Added Successfully with Id "+
    result.insertId});
    console.log("Record Added"+ result.insertId);
    });
    });


app.get('/companypayment',(req,res)=>{
const CompanyPaymentID= req.query.CompanyPaymentID;      
if (CompanyPaymentID == '%'){
db.query("SELECT * FROM companypayment where CompanyPaymentID LIKE ?", [CompanyPaymentID], function (err, result, fields)
{
if (err) throw err;
res.json(result);
console.log(result);
});
}
else{
db.query("SELECT * FROM companypayment where CompanyPaymentID = ?", [CompanyPaymentID], function (err, result, fields) {
if (err) throw err;
res.json(result);
console.log(result);
});
}
});

app.delete('/companypayment',(req,res)=>{
    const CompanyPaymentID = req.query.CompanyPaymentID;
    db.query("DELETE FROM companypayment where CompanyPaymentID = ?", [CompanyPaymentID], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message" : "Record Id ["+req.query.CompanyPaymentID+"] deleted Successfully"});
    console.log("Delete Request Received for record ["+req.query.CompanyPaymentID+"] received");
    });
    });

app.put('/companypayment',(req,res)=>{
    console.log("PUT Request Received");
    const CompanyPaymentID= req.query.CompanyPaymentID;
    db.query("UPDATE companypayment SET `Amount`= ? WHERE CompanyPaymentID = " + CompanyPaymentID ,
    [req.body.Amount], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Id ["+ CompanyPaymentID + "] is Updated Successfully"});
    console.log("Record Id ["+ CompanyPaymentID+ "] is Updated Successfully");
    });
    });
        

app.listen(PORT,
()=> console.log (`your server is up and run on http://localhost:${PORT}`)
);