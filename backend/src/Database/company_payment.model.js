export async function initCompanyPaymentTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS CompanyPayment (
            CompanyPaymentID INT AUTO_INCREMENT PRIMARY KEY,
            PaymentDate DATETIME NOT NULL,
            Amount DECIMAL(7,2) NOT NULL,
            CompanyID INT NOT NULL,
            PaymentID INT NOT NULL,
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID),
            FOREIGN KEY (PaymentID) REFERENCES Payment(PaymentID)
        )
    `);
}
