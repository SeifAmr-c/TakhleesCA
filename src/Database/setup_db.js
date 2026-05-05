import 'dotenv/config';
import mysql from 'mysql2/promise';

const DB_NAME = 'Takhlees';

/* Seed reference data the UI depends on. Idempotent: only inserts when
   the table is empty so re-running setup_db.js doesn't duplicate rows. */
async function seedReferenceData() {
    const { default: db } = await import('./connection.js');

    const runQuery = (sql, params = []) =>
        new Promise((resolve, reject) => {
            db.query(sql, params, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

    /* Category — Type column is an ENUM('Electronics','Cars','Clothes','Other').
       Product wants only the first three exposed, so we (a) seed only those
       three on a fresh DB and (b) clean up any pre-existing 'Other' row from
       earlier seedings. The CompanyCategory FK rows have to go first.
       The 'Other' value is left in the ENUM definition for backward
       compatibility — no harm in keeping an unused enum option. */
    await runQuery(
        `DELETE FROM companycategory
          WHERE CategoryID IN (SELECT CategoryID FROM category WHERE Type = 'Other')`
    );
    const purged = await runQuery("DELETE FROM category WHERE Type = 'Other'");
    if (purged.affectedRows > 0) {
        console.log(`Purged ${purged.affectedRows} legacy 'Other' category row(s).`);
    }

    const [{ count: catCount }] = await runQuery(
        'SELECT COUNT(*) AS count FROM category'
    );
    if (catCount === 0) {
        const categories = ['Electronics', 'Cars', 'Clothes'];
        for (const type of categories) {
            await runQuery('INSERT INTO category (`Type`) VALUES (?)', [type]);
        }
        console.log(`Seeded ${categories.length} categories.`);
    }

    /* Port — name + type + EstDate (NOT NULL). Use today's date as a
       harmless placeholder for the establishment date. */
    const [{ count: portCount }] = await runQuery(
        'SELECT COUNT(*) AS count FROM port'
    );
    if (portCount === 0) {
        const today = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const ports = [
            ['Alexandria', 'Sea', today],
            ['Damietta', 'Sea', today],
            ['Port Said', 'Sea', today],
            ['Cairo International Airport', 'Air', today],
            ['Suez', 'Sea', today],
        ];
        for (const [PortName, PortType, EstDate] of ports) {
            await runQuery(
                'INSERT INTO port (`PortName`,`PortType`,`EstDate`) VALUES (?,?,?)',
                [PortName, PortType, EstDate]
            );
        }
        console.log(`Seeded ${ports.length} ports.`);
    }
}

async function main() {
    const bootstrap = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
    });
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    await bootstrap.end();

    const { createUserTable } = await import('./user.model.js');
    const { createClientTable } = await import('./client.model.js');
    const { createAdminTable } = await import('./admin.model.js');
    const { createCompanyTable } = await import('./company.model.js');
    const { createPortTable } = await import('./port.model.js');
    const { createCompanyPortTable } = await import('./company_port.model.js');
    const { createCategoryTable } = await import('./category.model.js');
    const { createCompanyCategoryTable } = await import('./company_category.model.js');
    const { createApplicationTable } = await import('./application.model.js');
    const { createReviewTable } = await import('./review.model.js');
    const { createDocumentTable } = await import('./document.model.js');
    const { createPaymentTable } = await import('./payment.model.js');
    const { createCompanyPaymentTable } = await import('./company_payment.model.js');
    const { createSupportTicketTable } = await import('./support_ticket.js');

    await createUserTable();
    await createClientTable();
    await createAdminTable();
    await createSupportTicketTable();
    await createCompanyTable();
    await createPortTable();
    await createCompanyPortTable();
    await createCategoryTable();
    await createCompanyCategoryTable();
    await createApplicationTable();
    await createReviewTable();
    await createDocumentTable();
    await createPaymentTable();
    await createCompanyPaymentTable();

    await seedReferenceData();

    console.log('All tables are ready (created or already existed).');
    process.exit(0);
}

main().catch((err) => {
    console.error('Setup failed:', err.message);
    process.exit(1);
});
