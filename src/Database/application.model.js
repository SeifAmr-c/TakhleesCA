import db from "./connection.js";

export function createApplicationTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS Application (
            ApplicationID INT AUTO_INCREMENT PRIMARY KEY, 
            PaymentType ENUM('FULL', 'PARTIAL') NOT NULL,
            CompletionDate DATETIME,
            SubmissionDate DATETIME NOT NULL,
            TrackingNumber VARCHAR(255) NOT NULL,
            Status ENUM('Pending', 'In Progress', 'Completed') NOT NULL,
            DeliveryAddress VARCHAR(255) NOT NULL,
            CompanyEmployeeID INT NOT NULL,
            CategoryID INT NOT NULL,
            FOREIGN KEY (CompanyEmployeeID) REFERENCES CompanyEmployee(EmployeeID),
            FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}