import db from "./connection.js";

export function createUserTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS User (
            UserID INT AUTO_INCREMENT PRIMARY KEY, 
            FirstName VARCHAR(255) NOT NULL,
            LastName VARCHAR(255) NOT NULL,
            Email VARCHAR(255) NOT NULL UNIQUE,
            Password VARCHAR(255) NOT NULL,
            Type VARCHAR(1) NOT NULL
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}