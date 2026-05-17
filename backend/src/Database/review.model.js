export async function initReviewTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Review (
            ReviewID INT AUTO_INCREMENT PRIMARY KEY,
            Review VARCHAR(255),
            Rating INT NOT NULL,
            ApplicationID INT NOT NULL,
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID)
        )
    `);

    // Migration: drop the CategoryID FK and column if they exist from a prior schema
    const [cols] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Review' AND COLUMN_NAME = 'CategoryID'`
    );
    if (cols.length > 0) {
        const [fks] = await db.query(
            `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Review'
               AND COLUMN_NAME = 'CategoryID' AND REFERENCED_TABLE_NAME IS NOT NULL`
        );
        for (const { CONSTRAINT_NAME } of fks) {
            await db.query(`ALTER TABLE Review DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``);
        }
        await db.query(`ALTER TABLE Review DROP COLUMN CategoryID`);
        console.log('Migrated: dropped CategoryID from Review table.');
    }
}
