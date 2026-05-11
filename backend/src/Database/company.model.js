export async function initCompanyTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Company (
            CompanyID INT AUTO_INCREMENT PRIMARY KEY,
            Name VARCHAR(255) NOT NULL,
            ContactEmail VARCHAR(255) NOT NULL,
            FoundingDate DATETIME NOT NULL,
            Password VARCHAR(255) NOT NULL,
            Comm DECIMAL(4,2) NOT NULL,
            RegistrationDate DATETIME NOT NULL,
            TaxNumber INT NOT NULL,
            VerficationStatus  ENUM('Pending', 'Verified', 'Rejected') NOT NULL,
            ComReg VARCHAR(255),
            Governorate VARCHAR(20),
            Address VARCHAR(255),
            About VARCHAR(255),
            LogoUrl VARCHAR(255) DEFAULT NULL,
            PdfExportCount INT DEFAULT 0
        )
    `);
}
