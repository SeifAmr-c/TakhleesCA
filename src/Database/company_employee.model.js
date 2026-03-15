import db from "./connection.js";

export function createCompanyEmployeeTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS CompanyEmployee (
            EmployeeID INT AUTO_INCREMENT PRIMARY KEY, 
            Email VARCHAR(255) NOT NULL,
            FirstName VARCHAR(255) NOT NULL,
            LastName VARCHAR(255) NOT NULL,
            Phone INT(11) NOT NULL,
            CompanyID INT NOT NULL,
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID)
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}