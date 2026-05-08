export async function initCompanyPortTable(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS CompanyPort (
            CompanyID INT NOT NULL,
            PortID INT NOT NULL,
            PRIMARY KEY (CompanyID, PortID),
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID),
            FOREIGN KEY (PortID) REFERENCES Port(PortID)
        )
    `);
}
