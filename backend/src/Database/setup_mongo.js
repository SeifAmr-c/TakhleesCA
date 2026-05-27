import '../env.js';
import mongoose from 'mongoose';
import { connectMongo } from './mongo_connection.js';

/* Importing the model files registers their schemas with the shared
   mongoose connection. Collections are created lazily on first write. */
import Category from './mongo/category.mongo.js';
import Port from './mongo/port.mongo.js';
import './mongo/user.mongo.js';
import './mongo/company.mongo.js';
import './mongo/application.mongo.js';
import './mongo/review.mongo.js';
import './mongo/support_ticket.mongo.js';
import './mongo/company_payment.mongo.js';
import { ensureCounterAtLeast } from './mongo/counters.js';

/* One-time field rename across every collection. The dual-write branch
   stored public integer IDs under fields named `mysql*Id`; this branch
   uses `*ID` (e.g. `UserID`, `CompanyID`). Run on every setup so docs
   migrated from the previous shape get normalized in place. Idempotent
   — $rename quietly no-ops on docs that already use the new names. */
async function renameLegacyIdFields() {
    const db = mongoose.connection.db;
    const renames = [
        ['users',           { mysqlUserId:          'UserID' }],
        ['companies',       { mysqlCompanyId:       'CompanyID' }],
        ['applications',    {
            mysqlApplicationId: 'ApplicationID',
            mysqlCompanyId:     'CompanyID',
            mysqlClientId:      'ClientID',
            mysqlCategoryId:    'CategoryID',
            mysqlPortId:        'PortID',
        }],
        ['categories',      { mysqlCategoryId:      'CategoryID' }],
        ['ports',           { mysqlPortId:          'PortID' }],
        ['reviews',         {
            mysqlReviewId:      'ReviewID',
            mysqlApplicationId: 'ApplicationID',
            mysqlCategoryId:    'CategoryID',
            mysqlCompanyId:     'CompanyID',
            mysqlClientId:      'ClientID',
        }],
        ['supporttickets',  {
            mysqlTicketId:  'TicketID',
            mysqlAdminId:   'AdminID',
            mysqlClientId:  'ClientID',
        }],
        ['companypayments', {
            mysqlCompanyPaymentId: 'CompanyPaymentID',
            mysqlCompanyId:        'CompanyID',
            mysqlPaymentId:        'PaymentID',
        }],
    ];
    for (const [coll, fields] of renames) {
        const has = await db.listCollections({ name: coll }).hasNext();
        if (!has) continue;
        const result = await db.collection(coll).updateMany({}, { $rename: fields });
        if (result.modifiedCount > 0) {
            console.log(`Renamed legacy fields on ${result.modifiedCount} doc(s) in ${coll}.`);
        }
    }
    /* Application.documents[].mysqlDocumentId → DocumentID
       Application.payments[].mysqlPaymentId   → PaymentID
       Have to rebuild the array because positional $rename is not
       supported on array subdocs. */
    const apps = await db.collection('applications').find(
        { $or: [{ 'documents.mysqlDocumentId': { $exists: true } }, { 'payments.mysqlPaymentId': { $exists: true } }] }
    ).toArray();
    for (const app of apps) {
        const documents = (app.documents || []).map((d) => {
            if (d.mysqlDocumentId == null) return d;
            const { mysqlDocumentId, ...rest } = d;
            return { DocumentID: mysqlDocumentId, ...rest };
        });
        const payments = (app.payments || []).map((p) => {
            if (p.mysqlPaymentId == null) return p;
            const { mysqlPaymentId, ...rest } = p;
            return { PaymentID: mysqlPaymentId, ...rest };
        });
        await db.collection('applications').updateOne(
            { _id: app._id },
            { $set: { documents, payments } }
        );
    }
    /* Embedded join arrays on Company.ports[] and .categories[]. */
    const companies = await db.collection('companies').find(
        { $or: [{ 'ports.mysqlPortId': { $exists: true } }, { 'categories.mysqlCategoryId': { $exists: true } }] }
    ).toArray();
    for (const c of companies) {
        const ports = (c.ports || []).map((p) => {
            if (p.mysqlPortId == null) return p;
            const { mysqlPortId, ...rest } = p;
            return { PortID: mysqlPortId, ...rest };
        });
        const categories = (c.categories || []).map((cc) => {
            if (cc.mysqlCategoryId == null) return cc;
            const { mysqlCategoryId, ...rest } = cc;
            return { CategoryID: mysqlCategoryId, ...rest };
        });
        await db.collection('companies').updateOne(
            { _id: c._id },
            { $set: { ports, categories } }
        );
    }
}

/* Curated Arabic names for the reference data we seed and for migrating
   pre-existing English string values into the bilingual shape. Keyed by
   lower-cased English name; anything not found mirrors English (ar = en),
   which the admin can later correct via the management UI. */
const AR_NAMES = {
    // categories
    'electronics': 'إلكترونيات',
    'cars': 'سيارات',
    'clothes': 'ملابس',
    // ports
    'alexandria': 'الإسكندرية',
    'damietta': 'دمياط',
    'port said': 'بورسعيد',
    'cairo international airport': 'مطار القاهرة الدولي',
    'suez': 'السويس',
};

/* Turn a stored plain string into the { en, ar } shape. Returns null for
   non-strings (already localized, or absent) so callers can leave those
   untouched — this is what keeps the migration idempotent. */
const toLocalized = (val) => {
    if (typeof val !== 'string') return null;
    const en = val.trim();
    return { en, ar: AR_NAMES[en.toLowerCase()] || en };
};

/* One-time, idempotent rewrite of the curated reference fields from a
   plain string to the bilingual { en, ar } subdoc — on the master rows
   (Category.Type, Port.PortName) and every denormalized snapshot
   (Application.category/port, Review.category, Company.categories[]/
   ports[]). Driven through the native driver so the new schema's casting
   never trips over the old string data. Guarded on $type: 'string', so
   re-running after conversion is a no-op. */
async function migrateLocalizedFields() {
    const db = mongoose.connection.db;

    /* Master rows + single-valued snapshots: one updateOne per matching
       doc (the catalog is tiny, so a cursor loop is plenty). */
    const stringFieldTargets = [
        ['categories',   'Type'],
        ['ports',        'PortName'],
        ['reviews',      'category.Type'],
        ['applications', 'category.Type'],
        ['applications', 'port.PortName'],
    ];
    for (const [coll, field] of stringFieldTargets) {
        const has = await db.listCollections({ name: coll }).hasNext();
        if (!has) continue;
        const cursor = db.collection(coll).find({ [field]: { $type: 'string' } });
        let n = 0;
        for await (const doc of cursor) {
            // Walk the dotted path to read the current string value.
            const value = field.split('.').reduce((o, k) => (o == null ? o : o[k]), doc);
            const localized = toLocalized(value);
            if (!localized) continue;
            await db.collection(coll).updateOne({ _id: doc._id }, { $set: { [field]: localized } });
            n += 1;
        }
        if (n > 0) console.log(`Localized ${field} on ${n} doc(s) in ${coll}.`);
    }

    /* Company embedded arrays: rebuild each array, converting only the
       string entries. (Positional $set can't do a type-conditional set
       across all elements, so we rewrite the whole array.) */
    const hasCompanies = await db.listCollections({ name: 'companies' }).hasNext();
    if (hasCompanies) {
        const companies = await db.collection('companies').find({
            $or: [
                { 'categories.Type': { $type: 'string' } },
                { 'ports.PortName': { $type: 'string' } },
            ],
        }).toArray();
        for (const c of companies) {
            const categories = (c.categories || []).map((cc) => (
                typeof cc.Type === 'string' ? { ...cc, Type: toLocalized(cc.Type) } : cc
            ));
            const ports = (c.ports || []).map((p) => (
                typeof p.PortName === 'string' ? { ...p, PortName: toLocalized(p.PortName) } : p
            ));
            await db.collection('companies').updateOne(
                { _id: c._id },
                { $set: { categories, ports } }
            );
        }
        if (companies.length > 0) {
            console.log(`Localized embedded categories/ports on ${companies.length} company doc(s).`);
        }
    }
}

/* Seed reference data the UI depends on. Idempotent: only inserts when
   the collection is empty. */
async function seedReferenceData() {
    /* Purge any legacy 'Other' category docs left from earlier seedings —
       product only exposes Electronics / Cars / Clothes. Runs after the
       localized migration, so the name lives under Type.en now. */
    await Category.deleteMany({ 'Type.en': 'Other' });

    const catCount = await Category.countDocuments();
    if (catCount === 0) {
        await Category.insertMany(
            [
                { CategoryID: 1, name: 'Electronics' },
                { CategoryID: 2, name: 'Cars' },
                { CategoryID: 3, name: 'Clothes' },
            ].map(({ CategoryID, name }) => ({ CategoryID, Type: toLocalized(name) }))
        );
        console.log('Seeded 3 categories.');
    }

    const portCount = await Port.countDocuments();
    if (portCount === 0) {
        const today = new Date();
        await Port.insertMany(
            [
                { PortID: 1, name: 'Alexandria',                  PortType: 'Sea' },
                { PortID: 2, name: 'Damietta',                    PortType: 'Sea' },
                { PortID: 3, name: 'Port Said',                   PortType: 'Sea' },
                { PortID: 4, name: 'Cairo International Airport', PortType: 'Air' },
                { PortID: 5, name: 'Suez',                        PortType: 'Sea' },
            ].map(({ PortID, name, PortType }) => ({ PortID, PortName: toLocalized(name), PortType, EstDate: today }))
        );
        console.log('Seeded 5 ports.');
    }
}

/* Make sure every counter starts above the existing max public-ID in
   its target collection. Important when this branch is fed migrated
   data carrying pre-existing IDs from the prior MySQL system — fresh
   inserts must mint IDs above the migrated range. */
async function ensureCountersAboveMigrated() {
    const pairs = [
        ['user',             'User',           'UserID'],
        ['company',          'Company',        'CompanyID'],
        ['application',      'Application',    'ApplicationID'],
        ['category',         'Category',       'CategoryID'],
        ['port',             'Port',           'PortID'],
        ['review',           'Review',         'ReviewID'],
        ['support_ticket',   'SupportTicket',  'TicketID'],
        ['company_payment',  'CompanyPayment', 'CompanyPaymentID'],
    ];
    for (const [counterName, modelName, idField] of pairs) {
        const Model = mongoose.model(modelName);
        const max = await Model.findOne({}, { [idField]: 1 }).sort({ [idField]: -1 }).lean();
        const floor = max?.[idField] ?? 0;
        if (floor > 0) {
            await ensureCounterAtLeast(counterName, floor);
        }
    }
    /* document and payment counters need to scan inside embedded arrays. */
    const Application = mongoose.model('Application');
    const [docMax] = await Application.aggregate([
        { $unwind: '$documents' },
        { $group: { _id: null, max: { $max: '$documents.DocumentID' } } },
    ]);
    if (docMax?.max) await ensureCounterAtLeast('document', docMax.max);

    const [payMax] = await Application.aggregate([
        { $unwind: '$payments' },
        { $group: { _id: null, max: { $max: '$payments.PaymentID' } } },
    ]);
    if (payMax?.max) await ensureCounterAtLeast('payment', payMax.max);
}

async function main() {
    console.log(
        process.env.Mongo_url_local
            ? 'Using Mongo_url_local (local sandbox).'
            : 'Using Mongo_url.'
    );
    await connectMongo();
    try {
        await renameLegacyIdFields();
        await migrateLocalizedFields();
        await seedReferenceData();
        await ensureCountersAboveMigrated();
        console.log('Mongo reference data and counters are ready.');
    } finally {
        await mongoose.disconnect();
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Mongo setup failed:', err.message);
        process.exit(1);
    });
