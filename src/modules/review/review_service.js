import express from 'express';
import db from '../../Database/connection.js';
const PORT = 3000;
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.post('/review',(req,res)=>{
    console.log("Post Request Received");
    db.query("INSERT INTO review (`Review`,`Rating`,`ApplicationID`,`CategoryID`) VALUES (?,?,?,?)",
    [req.body.Review,req.body.Rating,req.body.ApplicationID,req.body.CategoryID], function (err, result,
    fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Added Successfully with Id "+
    result.insertId});
    console.log("Record Added"+ result.insertId);
    });
    });


app.get('/review',(req,res)=>{
const ReviewID= req.query.ReviewID;      
if (ReviewID == '%'){
db.query("SELECT * FROM review where ReviewID LIKE ?", [ReviewID], function (err, result, fields)
{
if (err) throw err;
res.json(result);
console.log(result);
});
}
else{
db.query("SELECT * FROM review where ReviewID = ?", [ReviewID], function (err, result, fields) {
if (err) throw err;
res.json(result);
console.log(result);
});
}
});

app.delete('/review',(req,res)=>{
    const ReviewID = req.query.ReviewID;
    db.query("DELETE FROM review where ReviewID = ?", [ReviewID], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message" : "Record Id ["+req.query.ReviewID+"] deleted Successfully"});
    console.log("Delete Request Received for record ["+req.query.ReviewID+"] received");
    });
    });

app.put('/review',(req,res)=>{
    console.log("PUT Request Received");
    const ReviewID= req.query.ReviewID;
    db.query("UPDATE review SET `Rating`= ? WHERE ReviewID = " + ReviewID ,
    [req.body.Rating], function (err, result, fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Id ["+ ReviewID + "] is Updated Successfully"});
    console.log("Record Id ["+ ReviewID+ "] is Updated Successfully");
    });
    });
        

app.listen(PORT,
()=> console.log (`your server is up and run on http://localhost:${PORT}`)
);