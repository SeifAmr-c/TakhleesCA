const express = require('express');
const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL server');
});

const app = express();
app.get('/createdb', (req, res) => {
    let sql = 'CREATE DATABASE IF NOT EXISTS Takhlees';
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.send('Database "Takhlees" is ready (created or already existed)');
    });
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
