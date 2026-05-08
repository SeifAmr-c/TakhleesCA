export async function initUserTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS User (
            UserID INT AUTO_INCREMENT PRIMARY KEY,
            FirstName VARCHAR(255) NOT NULL,
            LastName VARCHAR(255) NOT NULL,
            Email VARCHAR(255) NOT NULL UNIQUE,
            Password VARCHAR(255) NOT NULL,
            Type VARCHAR(1) NOT NULL
        )
    `);
}
