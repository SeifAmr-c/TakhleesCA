import db from "./connection.js";

export function createAdminTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS Admin (
            AdminID INT PRIMARY KEY, 
            LastLogin DATETIME NOT NULL,
            FOREIGN KEY (AdminID) REFERENCES User(UserID)
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}