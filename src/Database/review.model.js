export async function initReviewTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Review (
            ReviewID INT AUTO_INCREMENT PRIMARY KEY,
            Review VARCHAR(255),
            Rating INT NOT NULL,
            ApplicationID INT NOT NULL,
            CategoryID INT NOT NULL,
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID),
            FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
        )
    `);
}
