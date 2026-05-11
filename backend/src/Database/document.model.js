export async function initDocumentTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Document(
            DocumentID INT AUTO_INCREMENT PRIMARY KEY,
            DocType ENUM('National ID / Passport', 'Proof Of Payment', 'Delegation', 'Shipping Document') NOT NULL,
            UploadDate DATETIME,
            VerficationStatus ENUM('Pending', 'Accepted', 'Rejected') NOT NULL,
            ApplicationID INT NOT NULL,
            Path VARCHAR(255) NOT NULL,
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID)
        )
    `);
}
