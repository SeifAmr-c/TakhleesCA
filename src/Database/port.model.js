import db from "./connection.js";

export function createPortTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS Port (
            PortID INT AUTO_INCREMENT PRIMARY KEY,
            PortName VARCHAR(255) NOT NULL,
            PortType ENUM('Air', 'Sea') NOT NULL,
            EstDate DATETIME NOT NULL
        )
    `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}
