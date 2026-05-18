import 'dotenv/config';

/* Single source of truth for MySQL connection config so the runtime
   pool (connection.js), the migration script (setup_db.js) and the
   express-session store (app.controller.js) cannot drift apart.

   TLS policy: any DB_HOST that is not localhost / 127.0.0.1 is treated
   as a managed provider (TiDB Cloud, Aiven, PlanetScale, …) and TLS is
   ENFORCED regardless of NODE_ENV. There is no env flag to disable it
   — the only way to opt out is to point DB_HOST at a loopback address. */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST) {
    throw new Error('DB_HOST is not set. Refusing to start with an unknown database host.');
}

const isLocal = LOCAL_HOSTS.has(DB_HOST.toLowerCase());

/* mysql2 enables TLS as soon as the `ssl` option is present and truthy.
   `rejectUnauthorized: true` makes the client validate the server cert
   against Node's bundled CA store (TiDB Cloud's cert chains to a public
   root, so no CA file needs shipping). */
const sslConfig = isLocal
    ? undefined
    : { minVersion: 'TLSv1.2', rejectUnauthorized: true };

export const dbConfig = {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: sslConfig,
};

export const dbConfigNoDatabase = {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: sslConfig,
};

/* Log once at module load so Render's deploy log shows exactly which
   host + TLS state the process is using. Helps diagnose "insecure
   transport" complaints from TiDB without having to add ad-hoc logs. */
console.log(
    `[db] host=${DB_HOST} port=${DB_PORT} db=${DB_NAME} ssl=${sslConfig ? 'ENABLED' : 'disabled (localhost)'}`
);
