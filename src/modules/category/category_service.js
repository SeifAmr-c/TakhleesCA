import express from 'express';
import db from '../../Database/connection.js';
const PORT = 3000;
const app = express();
app.use(express.json());



app.get('/', (req, res) => {
    console.log(`Incoming Request http://localhost:${PORT}`);
    res.status(200).send('<H1>Welcome TO Node.js Server</H1>');
});

app.post('/category',(req,res)=>{
    console.log("Post Request Received");
    db.query("INSERT INTO category (`Type`) VALUES (?)",
    [req.body.Type], function (err, result,fields) {
    if (err) throw err;
    res.json({"Status":"OK", "Message": "Record Added Successfully with Id "+
    result.insertId});
    console.log("Record Added"+ result.insertId);
    });
    });

app.get('/category',(req,res)=>{
    const CategoryID= req.query.CategoryID;      
    if (CategoryID == '%'){
    db.query("SELECT * FROM category where CategoryID LIKE ?", [CategoryID], function (err, result, fields)
        {
        if (err) throw err;
        res.json(result);
        console.log(result);
        });
        }
        else{
        db.query("SELECT * FROM category where CategoryID = ?", [CategoryID], function (err, result, fields) {
        if (err) throw err;
        res.json(result);
        console.log(result);
        });
        }
        });
        
        app.delete('/category',(req,res)=>{
            const CategoryID = req.query.CategoryID;
            db.query("DELETE FROM category where CategoryID = ?", [CategoryID], function (err, result, fields) {
            if (err) throw err;
            res.json({"Status":"OK", "Message" : "Record Id ["+req.query.CategoryID+"] deleted Successfully"});
            console.log("Delete Request Received for record ["+req.query.CategoryID+"] received");
            });
            });
        
        app.put('/category',(req,res)=>{
            console.log("PUT Request Received");
            const CategoryID= req.query.CategoryID;
            db.query("UPDATE category SET `Type`= ? WHERE CategoryID = " + CategoryID ,
            [req.body.Type], function (err, result, fields) {
            if (err) throw err;
            res.json({"Status":"OK", "Message": "Record Id ["+ CategoryID + "] is Updated Successfully"});
            console.log("Record Id ["+ CategoryID+ "] is Updated Successfully");
            });
            });
                

app.listen(PORT,
()=> console.log (`your server is up and run on http://localhost:${PORT}`)
);