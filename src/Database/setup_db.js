import db from './connection.js';

import { createUserTable } from './user.model.js';
import { createClientTable } from './client.model.js';
import { createAdminTable } from './admin.model.js';
import { createCompanyTable } from './company.model.js';
import { createCompanyEmployeeTable } from './company_employee.model.js';
import { createCategoryTable } from './category.model.js';
import { createApplicationTable } from './application.model.js';
import { createReviewTable } from './review.model.js';
import { createDocumentTable } from './document.model.js';
import { createPaymentTable } from './payment.model.js';
import { createCompanyPaymentTable } from './company_payment.model.js';
import { createSupportTicketTable } from './support_ticket.js';

function query(sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

async function main() {
    await query('CREATE DATABASE IF NOT EXISTS Takhlees');

    await createUserTable();
    await createClientTable();
    await createAdminTable();
    await createSupportTicketTable();
    await createCompanyTable();
    await createCompanyEmployeeTable();
    await createCategoryTable();
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