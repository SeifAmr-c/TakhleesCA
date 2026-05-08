export async function initClientTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Client (
            ClientID INT PRIMARY KEY,
            PhoneNumber VARCHAR(11) NOT NULL UNIQUE,
            NationalID VARCHAR(14) NOT NULL UNIQUE,
            Address VARCHAR(255) NOT NULL,
            FOREIGN KEY (ClientID) REFERENCES User(UserID)
        )
    `);
}
