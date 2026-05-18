import mysql from 'mysql2/promise';
import { dbConfig } from './db_config.js';

/* All connection params (incl. TLS) come from db_config.js so behaviour
   matches setup_db.js and the express-session store. SSL is enforced
   whenever DB_HOST is not localhost — NODE_ENV is intentionally not
   part of that decision. */
const pool = mysql.createPool({
    ...dbConfig,
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
