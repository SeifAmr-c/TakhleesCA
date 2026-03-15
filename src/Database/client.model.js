import db from "./connection.js";

export function createClientTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS Client (
            ClientID INT PRIMARY KEY, 
            PhoneNumber INT(11) NOT NULL,
            NationalID INT(14) NOT NULL UNIQUE,
            Address VARCHAR(255) NOT NULL,
            FOREIGN KEY (ClientID) REFERENCES User(UserID)
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}