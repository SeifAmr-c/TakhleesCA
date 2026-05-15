import 'dotenv/config';
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

/* Seed reference data the UI depends on. Idempotent: only inserts when
   the collection is empty. */
async function seedReferenceData() {
    /* Purge any legacy 'Other' category docs left from earlier seedings —
       product only exposes Electronics / Cars / Clothes. */
    await Category.deleteMany({ Type: 'Other' });

    const catCount = await Category.countDocuments();
    if (catCount === 0) {
        await Category.insertMany([
            { CategoryID: 1, Type: 'Electronics' },
            { CategoryID: 2, Type: 'Cars' },
            { CategoryID: 3, Type: 'Clothes' },
        ]);
        console.log('Seeded 3 categories.');
    }

    const portCount = await Port.countDocuments();
    if (portCount === 0) {
        const today = new Date();
        await Port.insertMany([
            { PortID: 1, PortName: 'Alexandria',                  PortType: 'Sea', EstDate: today },
            { PortID: 2, PortName: 'Damietta',                    PortType: 'Sea', EstDate: today },
            { PortID: 3, PortName: 'Port Said',                   PortType: 'Sea', EstDate: today },
            { PortID: 4, PortName: 'Cairo International Airport', PortType: 'Air', EstDate: today },
            { PortID: 5, PortName: 'Suez',                        PortType: 'Sea', EstDate: today },
        ]);
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
    await connectMongo();
    try {
        await renameLegacyIdFields();
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
