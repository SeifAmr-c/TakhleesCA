import db from "./connection.js";

export function createDocumentTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS Document(
            DocumentID INT AUTO_INCREMENT PRIMARY KEY, 
            DocType ENUM('National ID / Passport', 'Proof Of Payment', 'Delegation', 'Other') NOT NULL,
            UploadDate DATETIME,
            VerficationStatus ENUM('Pending', 'Accepted', 'Rejected') NOT NULL,
            ClientID INT NOT NULL,
            ApplicationID INT NOT NULL,
            FOREIGN KEY (ClientID) REFERENCES Client(ClientID),
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID)
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}