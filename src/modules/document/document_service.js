import express from 'express';
import db from '../../Database/connection.js';
const PORT = 3000;
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.post('/document',(req,res)=>{
    console.log("Post Request Received");
    db.query("INSERT INTO document (`DocType`,`UploadDate`,`VerficationStatus`,`ClientID`,`ApplicationID`) VALUES (?,?,?,?,?)",
    [req.body.DocType,req.body.UploadDate,req.body.VerficationStatus,req.body.ClientID,req.body.ApplicationID], function (err, result,
    fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Added Successfully with Id "+
    result.insertId});
    console.log("Record Added"+ result.insertId);
    });
    });


app.get('/document',(req,res)=>{
const DocumentID= req.query.DocumentID;      
if (DocumentID == '%'){
db.query("SELECT * FROM document where DocumentID LIKE ?", [DocumentID], function (err, result, fields)
{
if (err) throw err;
res.json(result);
console.log(result);
});
}
else{
db.query("SELECT * FROM document where DocumentID = ?", [DocumentID], function (err, result, fields) {
if (err) throw err;
res.json(result);
console.log(result);
});
}
});

app.delete('/document',(req,res)=>{
    const DocumentID = req.query.DocumentID;
    db.query("DELETE FROM document where DocumentID = ?", [DocumentID], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message" : "Record Id ["+req.query.DocumentID+"] deleted Successfully"});
    console.log("Delete Request Received for record ["+req.query.DocumentID+"] received");
    });
    });

app.put('/document',(req,res)=>{
    console.log("PUT Request Received");
    const DocumentID= req.query.DocumentID;
    db.query("UPDATE document SET `VerficationStatus`= ? WHERE DocumentID = " + DocumentID ,
    [req.body.VerficationStatus], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Id ["+ DocumentID + "] is Updated Successfully"});
    console.log("Record Id ["+ DocumentID+ "] is Updated Successfully");
    });
    });
        

app.listen(PORT,
()=> console.log (`your server is up and run on http://localhost:${PORT}`)
);