import db from "./connection.js";

export function createCompanyTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS Company (
            CompanyID INT AUTO_INCREMENT PRIMARY KEY, 
            Name VARCHAR(255) NOT NULL,
            ContactEmail VARCHAR(255) NOT NULL,
            FoundingDate DATETIME NOT NULL,
            Password VARCHAR(255) NOT NULL,
            Comm DECIMAL(4,2) NOT NULL,
            RegistrationDate DATETIME NOT NULL,
            TaxNumber INT NOT NULL,
            VerficationStatus  ENUM('Pending', 'Verified', 'Rejected') NOT NULL
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}