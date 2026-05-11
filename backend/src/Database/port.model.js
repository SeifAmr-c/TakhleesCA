export async function initPortTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Port (
            PortID INT AUTO_INCREMENT PRIMARY KEY,
            PortName VARCHAR(255) NOT NULL,
            PortType ENUM('Air', 'Sea') NOT NULL,
            EstDate DATETIME NOT NULL
        )
    `);
}
