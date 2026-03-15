import db from "./connection.js";

export function createReviewTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS Review (
            ReviewID INT AUTO_INCREMENT PRIMARY KEY, 
            Review VARCHAR(255),
            Rating INT NOT NULL,
            ApplicationID INT NOT NULL,
            CategoryID INT NOT NULL,
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID),
            FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}