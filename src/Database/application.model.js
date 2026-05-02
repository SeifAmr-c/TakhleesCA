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
            CompanyID INT NOT NULL,
            CategoryID INT NOT NULL,
            ClientID INT NOT NULL,
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID),
            FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID),
            FOREIGN KEY (ClientID) REFERENCES Client(ClientID)
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}