import mysql from 'mysql';

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Takhlees',
    multipleStatements: true,
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL server');
});

export default db;
