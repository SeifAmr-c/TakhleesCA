import 'dotenv/config';
import mysql from 'mysql2/promise';

const DB_NAME = 'Takhlees';

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

    console.log('All tables are ready (created or already existed).');
    process.exit(0);
}

main().catch((err) => {
    console.error('Setup failed:', err.message);
    process.exit(1);
});
