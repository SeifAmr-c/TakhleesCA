export async function initApplicationTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Application (
            ApplicationID INT AUTO_INCREMENT PRIMARY KEY,
            PaymentType ENUM('FULL', 'PARTIAL') NOT NULL,
            CompletionDate DATETIME,
            SubmissionDate DATETIME NOT NULL,
            TrackingNumber VARCHAR(255) NOT NULL,
            Status ENUM('Pending', 'In Progress', 'Completed') NOT NULL,
            DeliveryAddress VARCHAR(255) NOT NULL,
            ACID VARCHAR(19) NOT NULL,
            CompletionToken VARCHAR(255) UNIQUE,
            CompanyID INT NULL,
            CategoryID INT NOT NULL,
            ClientID INT NULL,
            PortID INT NOT NULL,
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID),
            FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID),
            FOREIGN KEY (ClientID) REFERENCES Client(ClientID),
            FOREIGN KEY (PortID) REFERENCES Port(PortID)
        )
    `);
}
