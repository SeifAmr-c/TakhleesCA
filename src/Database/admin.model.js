export async function initAdminTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Admin (
            AdminID INT PRIMARY KEY,
            LastLogin DATETIME NOT NULL,
            FOREIGN KEY (AdminID) REFERENCES User(UserID)
        )
    `);
}
