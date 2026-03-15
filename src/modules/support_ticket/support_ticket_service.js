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
    app.listen(PORT,
    ()=> console.log (`your server is up and run on http://localhost:${PORT}`)
    );