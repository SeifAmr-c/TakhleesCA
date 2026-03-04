app.get('/createuser', (req, res) => {
    let sql = `
        CREATE TABLE user (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            first_name VARCHAR(255) NOT NULL,
            National_id INT(14) NOT NULL UNIQUE,
            last_name varchar(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            type VARCHAR(1) NOT NULL
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("User table created successfully")
    });
}) ;