import db from "./connection.js";

export function createClientTable() {
    const createSql = `
        CREATE TABLE IF NOT EXISTS Client (
            ClientID INT PRIMARY KEY, 
            PhoneNumber VARCHAR(11) NOT NULL,
            NationalID VARCHAR(14) NOT NULL UNIQUE,
            Address VARCHAR(255) NOT NULL,
            FOREIGN KEY (ClientID) REFERENCES User(UserID)
        )
    `;

    const alterPhone = `ALTER TABLE Client MODIFY PhoneNumber VARCHAR(11) NOT NULL`;
    const alterNational = `ALTER TABLE Client MODIFY NationalID VARCHAR(14) NOT NULL`;

    return new Promise((resolve, reject) => {
        db.query(createSql, (err) => {
            if (err) return reject(err);

            db.query(alterPhone, (err) => {
                if (err) return reject(err);

                db.query(alterNational, (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        });
    });
}