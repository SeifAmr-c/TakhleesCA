export async function initPaymentTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Payment (
            PaymentID INT AUTO_INCREMENT PRIMARY KEY,
            PaymentDate DATETIME NOT NULL,
            Amount DECIMAL(7,2) NOT NULL,
            PaymentGateway ENUM('Credit Card', 'Bank Transfer') NOT NULL,
            ApplicationID INT NOT NULL,
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID)
        )
    `);
}
