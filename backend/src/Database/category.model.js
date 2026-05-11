export async function initCategoryTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Category(
            CategoryID INT AUTO_INCREMENT PRIMARY KEY,
            Type ENUM('Electronics', 'Cars', 'Clothes', 'Other') NOT NULL
        )
    `);
}
