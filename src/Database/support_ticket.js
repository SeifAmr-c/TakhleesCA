import db from "./connection.js";

export function createSupportTicketTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS SupportTicket (
            TicketID INT AUTO_INCREMENT PRIMARY KEY, 
            Issue VARCHAR(255) NOT NULL,
            Resolved BOOLEAN NOT NULL,
            AdminID INT,
            ClientID INT NOT NULL,
            FOREIGN KEY (AdminID) REFERENCES Admin(AdminID),
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