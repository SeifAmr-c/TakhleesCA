import 'dotenv/config';
import mongoose from 'mongoose';

/* Single Mongoose connection shared by every model.
   Mongoose maintains an internal pool, so import this file once at boot
   and then `import mongoose from 'mongoose'` (or import a model) anywhere
   you need to read/write — they all share this connection. */
export async function connectMongo() {
    if (mongoose.connection.readyState === 1) return mongoose.connection;

    const url = process.env.Mongo_url;
    if (!url) throw new Error('Mongo_url is not set in .env');

    await mongoose.connect(url, {
        dbName: 'Takhlees',
        serverSelectionTimeoutMS: 10_000,
    });

    console.log('Connected to MongoDB Atlas');
    return mongoose.connection;
}

mongoose.connection.on('error', (err) => {
    console.error('[mongo error]', err);
});
mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected');
});

export default mongoose;
