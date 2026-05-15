import mongoose from 'mongoose';

/* Auto-incrementing integer ID generator.

   Backs the public-facing numeric IDs that the React frontend expects
   (UserID, CompanyID, ApplicationID, …). Each collection has one counter
   row keyed by `name`; nextId() does an atomic $inc and returns the new
   value, so two parallel inserts cannot collide on the same ID. */
const CounterSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        seq: { type: Number, required: true, default: 0 },
    },
    { collection: 'counters' }
);

const Counter = mongoose.model('Counter', CounterSchema);

export async function nextId(name) {
    const doc = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    return doc.seq;
}

/* Seed a counter to at least `floor` so a fresh database that imports
   migrated data with high pre-existing IDs keeps minting IDs above the
   migrated range. */
export async function ensureCounterAtLeast(name, floor) {
    await Counter.findByIdAndUpdate(
        name,
        { $max: { seq: floor } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
}

export default Counter;
