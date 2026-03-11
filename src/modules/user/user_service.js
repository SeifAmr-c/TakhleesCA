const mysql = require('mysql'); 
const express = require('express');
const PORT= 3000; 
const app = express(); 

global.con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "examples"
  });
  con.connect(function(err) {
    if (err) throw err;
  });
app.get('/',(req,res)=>{
    console.log (`Incoming Request http://localhost:${PORT}`)
    res.status(200).send("<H1>Welcome TO Node.js Server</H1>")
});

app.get('/user',(req,res)=>{
    var user_id= req.query.id;
    var type = req.query.type;
    if (user_id == '%' && type == "C"){
        con.query("SELECT * FROM User RIGHT JOIN Client ON User.UserID = Client.ClientID where User.UserID LIKE ?", [user_id], function (err, result, fields)     
          {
            if (err) throw err;
            res.json(result);
            console.log(result);
          });
    }
    else if (user_id == '%' && type == "A"){
        con.query("SELECT * FROM User RIGHT JOIN Admin ON User.UserID = Admin.ClientID where User.UserID LIKE ?", [user_id], function (err, result, fields)     
          {
            if (err) throw err;
            res.json(result);
            console.log(result);
          });
    }
    else if (type == "C"){
    con.query("SELECT * FROM User RIGHT JOIN Client ON User.UserID = Client.ClientID where UserID = ?", [user_id], function (err, result, fields) {
        if (err) throw err;
        res.json(result);
        console.log(result);
        });
    }
    else{
    con.query("SELECT * FROM User RIGHT JOIN Admin ON User.UserID = Admin.AdminID where UserID = ?", [user_id], function (err, result, fields) {
        if (err) throw err;
        res.json(result);
        console.log(result);
      });
    }
});
app.listen(PORT, 
    ()=> console.log (`your server is up and run on http://localhost:${PORT}`)
);