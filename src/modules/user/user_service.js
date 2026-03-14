import mysql from 'mysql';
import express from 'express';
const PORT= 3000; 
const app = express();
app.use(express.json());

global.con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "Takhlees",
    multipleStatements: true
  });
  con.connect(function(err) {
    if (err) throw err;
  });
app.get('/',(req,res)=>{
    console.log (`Incoming Request http://localhost:${PORT}`)
    res.status(200).send("<H1>Welcome TO Node.js Server</H1>")
});

app.get('/User',(req,res)=>{
    var user_id= req.query.UserID;
    var type = req.query.Type;
    if (user_id == '%' && type == "C"){
        con.query("SELECT * FROM User RIGHT JOIN Client ON User.UserID = Client.ClientID where User.UserID LIKE ?", [user_id], function (err, result, fields) {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Database error" });
            }
            res.json(result);
            console.log(result);
          });
    }
    else if (user_id == '%' && type == "A"){
        con.query("SELECT * FROM User RIGHT JOIN Admin ON User.UserID = Admin.ClientID where User.UserID LIKE ?", [user_id], function (err, result, fields) {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Database error" });
            }
            res.json(result);
            console.log(result);
          });
    }
    else if (type == "C"){
    con.query("SELECT * FROM User RIGHT JOIN Client ON User.UserID = Client.ClientID where UserID = ?", [user_id], function (err, result, fields) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Database error" });
        }
        res.json(result);
        console.log(result);
        });
    }
    else{
    con.query("SELECT * FROM User RIGHT JOIN Admin ON User.UserID = Admin.AdminID where UserID = ?", [user_id], function (err, result, fields) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Database error" });
        }
        res.json(result);
        console.log(result);
      });
    }
});

app.post('/User',(req,res)=>{
  console.log("Post Request Received");
  
  var type = req.body.Type ?? req.body.type;
  if (type == "C"){
    con.query("INSERT INTO User (`FirstName`, `LastName`,`Email`,`Password`,`Type`) VALUES (?,?,?,?,?); INSERT INTO Client (`ClientID`,`PhoneNumber`,`NationalID`,`Address`) VALUES ((SELECT UserID FROM User WHERE Email = ?),?,?,?);", 
      [req.body.FirstName,req.body.LastName,req.body.Email,req.body.Password,req.body.Type,req.body.Email,req.body.PhoneNumber,req.body.NationalID,req.body.Address], function (err, results, 
      fields) {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
          }
          console.log("Insert results (User + Client):", results);
          const userInsertResult = Array.isArray(results) ? results[0] : results;
          res.json({"Status":"OK", "Message": "Record Added Successfully with Id "+
      userInsertResult.insertId});
        
            console.log("Record Added "+ userInsertResult.insertId);
       });
  }
  else if (type == "A"){
    con.query("INSERT INTO User (`FirstName`, `LastName`,`Email`,`Password`,`Type`) VALUES (?,?,?,?,?); INSERT INTO Admin (`AdminID`,`LastLogin`) VALUES ((SELECT UserID FROM User WHERE Email = ?),NOW());", 
      [req.body.FirstName,req.body.LastName,req.body.Email,req.body.Password,req.body.Type,req.body.Email], function (err, results, 
      fields) {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
          }
          console.log("Insert results (User + Admin):", results);
          const userInsertResult = Array.isArray(results) ? results[0] : results;
          res.json({"Status":"OK", "Message": "Record Added Successfully with Id "+
      userInsertResult.insertId});
        
            console.log("Record Added "+ userInsertResult.insertId);
       });
  }
  else{
    res.status(400).json({ error: "Invalid type" });
    console.log("Invalid type");
  }
});

app.listen(PORT, 
    ()=> console.log (`your server is up and run on http://localhost:${PORT}`)
);