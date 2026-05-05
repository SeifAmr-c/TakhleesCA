import db from "./connection.js";

export function createCompanyCategoryTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS CompanyCategory (
            CompanyID INT NOT NULL,
            CategoryID INT NOT NULL,
            Price DECIMAL(7,2) NOT NULL,
            PRIMARY KEY (CompanyID, CategoryID),
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID),
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
