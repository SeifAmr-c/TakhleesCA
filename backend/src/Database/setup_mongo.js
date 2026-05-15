import 'dotenv/config';
import { connectMongo } from './mongo_connection.js';
import mongoose from 'mongoose';

/* Importing the models registers them on the shared mongoose connection.
   Collections are auto-created on first write — no DDL step needed, unlike
   MySQL's setup_db.js. */
import Category from './mongo/category.mongo.js';
import Port from './mongo/port.mongo.js';

/* Seed reference data the UI depends on. Idempotent: only inserts when the
   collection is empty so re-running setup_mongo.js doesn't duplicate rows.
   Mirrors seedReferenceData() in setup_db.js. */
async function seedReferenceData() {
    /* Category — Product wants only Electronics/Cars/Clothes exposed. Any
       pre-existing 'Other' doc from earlier seedings is purged so the two
       databases stay aligned. The 'Other' value is left in the schema enum
       for backward compatibility, matching setup_db.js. */
    const purged = await Category.deleteMany({ Type: 'Other' });
    if (purged.deletedCount > 0) {
        console.log(`Purged ${purged.deletedCount} legacy 'Other' category doc(s).`);
    }

    const catCount = await Category.countDocuments();
    if (catCount === 0) {
        /* mysqlCategoryId mirrors the AUTO_INCREMENT PK MySQL hands out
           (1=Electronics, 2=Cars, 3=Clothes on a fresh DB) so dual-write
           code paths can reconcile rows across both databases. */
        const categories = [
            { mysqlCategoryId: 1, Type: 'Electronics' },
            { mysqlCategoryId: 2, Type: 'Cars' },
            { mysqlCategoryId: 3, Type: 'Clothes' },
        ];
        await Category.insertMany(categories);
        console.log(`Seeded ${categories.length} categories.`);
    }

    const portCount = await Port.countDocuments();
    if (portCount === 0) {
        const today = new Date();
        const ports = [
            { mysqlPortId: 1, PortName: 'Alexandria',                 PortType: 'Sea', EstDate: today },
            { mysqlPortId: 2, PortName: 'Damietta',                   PortType: 'Sea', EstDate: today },
            { mysqlPortId: 3, PortName: 'Port Said',                  PortType: 'Sea', EstDate: today },
            { mysqlPortId: 4, PortName: 'Cairo International Airport', PortType: 'Air', EstDate: today },
            { mysqlPortId: 5, PortName: 'Suez',                       PortType: 'Sea', EstDate: today },
        ];
        await Port.insertMany(ports);
        console.log(`Seeded ${ports.length} ports.`);
    }
}

async function main() {
    await connectMongo();
    try {
        await seedReferenceData();
        console.log('Mongo reference data is ready.');
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
