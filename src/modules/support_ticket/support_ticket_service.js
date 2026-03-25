import express from 'express';
import db from '../../Database/connection.js';
const PORT = 3000;
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.post('/supportticket',(req,res)=>{
    console.log("Post Request Received");
    db.query("INSERT INTO supportticket (`Issue`,`Resolved`,`AdminID`,`ClientID`) VALUES (?,?,?,?)",
    [req.body.Issue,req.body.Resolved,req.body.AdminID,req.body.ClientID], function (err, result,
    fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Added Successfully with Id "+
    result.insertId});
    console.log("Record Added"+ result.insertId);
    });
    });


app.get('/supportticket',(req,res)=>{
const TicketID= req.query.TicketID;      
if (TicketID == '%'){
db.query("SELECT * FROM supportticket where TicketID LIKE ?", [TicketID], function (err, result, fields)
{
if (err) throw err;
res.json(result);
console.log(result);
});
}
else{
db.query("SELECT * FROM supportticket where TicketID = ?", [TicketID], function (err, result, fields) {
if (err) throw err;
res.json(result);
console.log(result);
});
}
});

app.delete('/supportticket',(req,res)=>{
    const TicketID = req.query.TicketID;
    db.query("DELETE FROM supportticket where TicketID = ?", [TicketID], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message" : "Record Id ["+req.query.TicketID+"] deleted Successfully"});
    console.log("Delete Request Received for record ["+req.query.TicketID+"] received");
    });
    });

app.put('/supportticket',(req,res)=>{
    console.log("PUT Request Received");
    const TicketID= req.query.TicketID;
    db.query("UPDATE supportticket SET `Resolved`= ? WHERE TicketID = " + TicketID ,
    [req.body.Resolved], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Id ["+ TicketID + "] is Updated Successfully"});
    console.log("Record Id ["+ TicketID+ "] is Updated Successfully");
    });
    });
        

app.listen(PORT,
()=> console.log (`your server is up and run on http://localhost:${PORT}`)
);