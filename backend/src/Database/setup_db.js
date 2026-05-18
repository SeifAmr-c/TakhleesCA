import mysql from 'mysql2/promise';
import { dbConfig, dbConfigNoDatabase } from './db_config.js';

import { initUserTable } from './user.model.js';
import { initClientTable } from './client.model.js';
import { initAdminTable } from './admin.model.js';
import { initSupportTicketTable } from './support_ticket.js';
import { initCompanyTable } from './company.model.js';
import { initPortTable } from './port.model.js';
import { initCompanyPortTable } from './company_port.model.js';
import { initCategoryTable } from './category.model.js';
import { initCompanyCategoryTable } from './company_category.model.js';
import { initApplicationTable } from './application.model.js';
import { initReviewTable } from './review.model.js';
import { initDocumentTable } from './document.model.js';
import { initPaymentTable } from './payment.model.js';
import { initCompanyPaymentTable } from './company_payment.model.js';

const DB_NAME = dbConfig.database;

/* Seed reference data the UI depends on. Idempotent: only inserts when
   the table is empty so re-running setup_db.js doesn't duplicate rows. */
async function seedReferenceData(pool) {
    /* Category — Type column is an ENUM('Electronics','Cars','Clothes','Other').
       Product wants only the first three exposed, so we (a) seed only those
       three on a fresh DB and (b) clean up any pre-existing 'Other' row from
       earlier seedings. The CompanyCategory FK rows have to go first.
       The 'Other' value is left in the ENUM definition for backward
       compatibility — no harm in keeping an unused enum option. */
    await pool.query(
        `DELETE FROM companycategory
          WHERE CategoryID IN (SELECT CategoryID FROM category WHERE Type = 'Other')`
    );
    const [purged] = await pool.query("DELETE FROM category WHERE Type = 'Other'");
    if (purged.affectedRows > 0) {
        console.log(`Purged ${purged.affectedRows} legacy 'Other' category row(s).`);
    }

    const [catRows] = await pool.query('SELECT COUNT(*) AS count FROM category');
    if (catRows[0].count === 0) {
        const categories = ['Electronics', 'Cars', 'Clothes'];
        for (const type of categories) {
            await pool.query('INSERT INTO category (`Type`) VALUES (?)', [type]);
        }
        console.log(`Seeded ${categories.length} categories.`);
    }

    const [portRows] = await pool.query('SELECT COUNT(*) AS count FROM port');
    if (portRows[0].count === 0) {
        const today = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const ports = [
            ['Alexandria', 'Sea', today],
            ['Damietta', 'Sea', today],
            ['Port Said', 'Sea', today],
            ['Cairo International Airport', 'Air', today],
            ['Suez', 'Sea', today],
        ];
        for (const [PortName, PortType, EstDate] of ports) {
            await pool.query(
                'INSERT INTO port (`PortName`,`PortType`,`EstDate`) VALUES (?,?,?)',
                [PortName, PortType, EstDate]
            );
        }
        console.log(`Seeded ${ports.length} ports.`);
    }
}

async function main() {
    /* Bootstrap connection (no database selected) so we can create the
       target database before opening a pool that pins it. */
    const bootstrap = await mysql.createConnection(dbConfigNoDatabase);
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    await bootstrap.end();

    const pool = mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    try {
        /* FK dependency order: User → Client/Admin → SupportTicket;
           Company → Port/CompanyPort, Category/CompanyCategory;
           Application → Review/Document/Payment/CompanyPayment. */
        await initUserTable(pool);
        await initClientTable(pool);
        await initAdminTable(pool);
        await initSupportTicketTable(pool);
        await initCompanyTable(pool);
        await initPortTable(pool);
        await initCompanyPortTable(pool);
        await initCategoryTable(pool);
        await initCompanyCategoryTable(pool);
        await initApplicationTable(pool);
        await initReviewTable(pool);
        await initDocumentTable(pool);
        await initPaymentTable(pool);
        await initCompanyPaymentTable(pool);

        await seedReferenceData(pool);

        console.log('All tables are ready (created or already existed).');
    } finally {
        await pool.end();
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Setup failed:', err.message);
        process.exit(1);
    });
