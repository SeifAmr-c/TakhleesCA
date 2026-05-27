import '../env.js';
import mongoose from 'mongoose';

/* Single Mongoose connection shared by every model.
   Mongoose maintains an internal pool, so import this file once at boot
   and then `import mongoose from 'mongoose'` (or import a model) anywhere
   you need to read/write — they all share this connection. */
/* Resolve the connection string. A local sandbox URL (Mongo_url_local)
   takes precedence over Mongo_url when present, so local dev and the
   setup_mongo migration both run against the safe sandbox without
   touching the production Atlas string. Production only sets Mongo_url,
   so it is unaffected. */
export function getMongoUrl() {
    return process.env.Mongo_url_local || process.env.Mongo_url;
}

/* True when a local sandbox URL is configured — i.e. we are running
   against Mongo_url_local, not the production string. */
export function isLocalSandbox() {
    return Boolean(process.env.Mongo_url_local);
}

/* Read the database name out of the connection string's path, if it has
   one (e.g. mongodb://localhost:27017/takhlees-local -> "takhlees-local").
   The production SRV string carries no path, so it falls back to the
   historical 'Takhlees'. Honouring the URL's own db name is what lets the
   local sandbox live in its own database instead of silently sharing the
   'Takhlees' name with production. */
function dbNameFromUrl(url) {
    if (!url) return null;
    const m = url.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
    return m && m[1] ? decodeURIComponent(m[1]) : null;
}

export function getDbName() {
    return dbNameFromUrl(getMongoUrl()) || 'Takhlees';
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0)$/i;

export async function connectMongo() {
    if (mongoose.connection.readyState === 1) return mongoose.connection;

    const url = getMongoUrl();
    if (!url) throw new Error('Neither Mongo_url_local nor Mongo_url is set in .env');

    const local = isLocalSandbox();

    await mongoose.connect(url, {
        dbName: getDbName(),
        serverSelectionTimeoutMS: 10_000,
    });

    const { host, port, name } = mongoose.connection;

    /* Quarantine guard. If a local sandbox URL is configured we MUST end
       up on a local host. If for any reason the resolved connection is
       pointing at a remote host, refuse to serve — better to fail loudly
       at boot than to read/write production while the developer believes
       they are on the sandbox. */
    if (local && host && !LOCAL_HOST.test(host)) {
        await mongoose.disconnect();
        throw new Error(
            `Refusing to start: Mongo_url_local is set but the connection resolved to non-local host "${host}". ` +
            `Aborting to keep local runs quarantined from production.`
        );
    }

    console.log(
        `Connected to MongoDB [${local ? 'LOCAL sandbox' : 'production'}] host=${host}:${port} db=${name}`
    );
    return mongoose.connection;
}

mongoose.connection.on('error', (err) => {
    console.error('[mongo error]', err);
});
mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected');
});

export default mongoose;
