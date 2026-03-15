import db from "./connection.js";

export function createCategoryTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS Category(
            CategoryID INT AUTO_INCREMENT PRIMARY KEY, 
            Type ENUM('Electronics', 'Cars', 'Clothes', 'Other') NOT NULL
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}