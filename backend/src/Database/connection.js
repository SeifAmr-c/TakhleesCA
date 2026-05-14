import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Callback-style shim so existing services using `db.query(sql, params, cb)`
// keep working without any changes. Internally delegates to the promise pool.
const db = {
    query(sql, params, cb) {
        if (typeof params === 'function') {
            cb = params;
            params = undefined;
        }
        const promise = params === undefined
            ? pool.query(sql)
            : pool.query(sql, params);

        if (typeof cb === 'function') {
            promise
                .then(([rows, fields]) => cb(null, rows, fields))
                .catch((err) => cb(err));
            return;
        }
        return promise.then(([rows]) => rows);
    },
    pool,
};

pool.query('SELECT 1')
    .then(() => console.log('Connected to MySQL server'))
    .catch((err) => { throw err; });

export default db;
