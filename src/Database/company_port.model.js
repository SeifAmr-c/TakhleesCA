import db from "./connection.js";

export function createCompanyPortTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS CompanyPort (
            CompanyID INT NOT NULL,
            PortID INT NOT NULL,
            PRIMARY KEY (CompanyID, PortID),
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID),
            FOREIGN KEY (PortID) REFERENCES Port(PortID)
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}
