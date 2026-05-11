export async function initSupportTicketTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS SupportTicket (
            TicketID INT AUTO_INCREMENT PRIMARY KEY,
            Issue VARCHAR(255) NOT NULL,
            Resolved BOOLEAN NOT NULL,
            AdminID INT,
            ClientID INT NOT NULL,
            FOREIGN KEY (AdminID) REFERENCES Admin(AdminID),
            FOREIGN KEY (ClientID) REFERENCES Client(ClientID)
        )
    `);
}
