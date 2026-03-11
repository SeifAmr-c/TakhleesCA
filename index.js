const express = require('express');
const mysql = require('mysql');
const PORT = 3000;
const app = express();

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Takhlees',
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL server');
});

app.get('/createdb', (req, res) => {
    let sql = 'CREATE DATABASE IF NOT EXISTS Takhlees';
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.send('Database "Takhlees" is ready (created or already existed)');
    });
});
app.get('/createUser', (req, res) => {
    let sql = `
        CREATE TABLE User (
            UserID INT AUTO_INCREMENT PRIMARY KEY, 
            FirstName VARCHAR(255) NOT NULL,
            LastName varchar(255) NOT NULL,
            Email VARCHAR(255) NOT NULL UNIQUE,
            Password VARCHAR(255) NOT NULL,
            Type VARCHAR(1) NOT NULL
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("User table created successfully")
    });
}) ;
app.get('/createClient', (req, res) => {
    let sql = `
        CREATE TABLE Client (
            ClientID INT  PRIMARY KEY, 
            PhoneNumber INT (11) NOT NULL,
            NationalID INT(14) NOT NULL UNIQUE,
            Address VARCHAR(255) NOT NULL,
            FOREIGN KEY (ClientID) REFERENCES User(UserID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("Client table created successfully")
    });
}) ;
app.get('/createAdmin', (req, res) => {
    let sql = `
        CREATE TABLE Admin (
            AdminID INT  PRIMARY KEY, 
            LastLogin DATETIME NOT NULL,
            FOREIGN KEY (AdminID) REFERENCES User(UserID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("Admin table created successfully")
    });
}) ;
app.get('/createSupportTicket', (req, res) => {
    let sql = `
        CREATE TABLE SupportTicket (
            TicketID INT AUTO_INCREMENT PRIMARY KEY, 
            Issue VARCHAR(255) NOT NULL,
            Resolved BOOLEAN NOT NULL,
            AdminID INT,
            ClientID INT NOT NULL,
            FOREIGN KEY (AdminID) REFERENCES Admin(AdminID),
            FOREIGN KEY (ClientID) REFERENCES Client(ClientID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("SupportTicket table created successfully")
    });
}) ;
app.get('/createCompany', (req, res) => {
    let sql = `
        CREATE TABLE Company (
            CompanyID INT AUTO_INCREMENT PRIMARY KEY, 
            Name VARCHAR(255) NOT NULL,
            ContactEmail VARCHAR(255) NOT NULL,
            FoundingDate DATETIME NOT NULL,
            Password VARCHAR(255) NOT NULL,
            Comm DECIMAL(4,2) NOT NULL,
            RegistrationDate DATETIME NOT NULL,
            TaxNumber INT NOT NULL,
            VerficationStatus  ENUM('Pending', 'Verified', 'Rejected') NOT NULL
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("Company table created successfully")
    });
}) ;
app.get('/createCompanyEmployee', (req, res) => {
    let sql = `
        CREATE TABLE CompanyEmployee (
            EmployeeID INT AUTO_INCREMENT PRIMARY KEY, 
            Email VARCHAR(255) NOT NULL,
            FirstName VARCHAR(255) NOT NULL,
            LastName VARCHAR(255) NOT NULL,
            Phone INT(11) NOT NULL,
            CompanyID INT NOT NULL,
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("CompanyEmployee table created successfully")
    });
}) ;
app.get('/createCategory', (req, res) => {
    let sql = `
        CREATE TABLE Category(
            CategoryID INT AUTO_INCREMENT PRIMARY KEY, 
            Type ENUM('Electronics', 'Cars', 'Clothes', 'Other') NOT NULL
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("Category table created successfully")
    });
}) ;
app.get('/createApplication', (req, res) => {
    let sql = `
        CREATE TABLE Application (
            ApplicationID INT AUTO_INCREMENT PRIMARY KEY, 
            PaymentType ENUM('FULL', 'PARTIAL') NOT NULL,
            CompletionDate DATETIME,
            SubmissionDate DATETIME NOT NULL,
            TrackingNumber VARCHAR(255) NOT NULL,
            Status ENUM('Pending', 'In Progress', 'Completed') NOT NULL,
            DeliveryAddress VARCHAR(255) NOT NULL,
            CompanyEmployeeID INT NOT NULL,
            CategoryID INT NOT NULL,
            FOREIGN KEY (CompanyEmployeeID) REFERENCES CompanyEmployee(EmployeeID),
            FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("Application table created successfully")
    });
}) ;
app.get('/createReview', (req, res) => {
    let sql = `
        CREATE TABLE Review (
            ReviewID INT AUTO_INCREMENT PRIMARY KEY, 
            Review VARCHAR(255),
            Rating INT NOT NULL,
            ApplicationID INT NOT NULL,
            CategoryID INT NOT NULL,
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID),
            FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("Review table created successfully")
    });
}) ;
app.get('/createDocument', (req, res) => {
    let sql = `
        CREATE TABLE Document(
            DocumentID INT AUTO_INCREMENT PRIMARY KEY, 
            DocType ENUM('National ID / Passport', 'Proof Of Payment', 'Delegation', 'Other') NOT NULL,
            UploadDate DATETIME,
            VerficationStatus ENUM('Pending', 'Accepted', 'Rejected') NOT NULL,
            ClientID INT NOT NULL,
            ApplicationID INT NOT NULL,
            FOREIGN KEY (ClientID) REFERENCES Client(ClientID),
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("Document table created successfully")
    });
}) ;
app.get('/createPayment', (req, res) => {
    let sql = `
        CREATE TABLE Payment (
            PaymentID INT AUTO_INCREMENT PRIMARY KEY, 
            PaymentDate DATETIME NOT NULL,
            Amount DECIMAL(7,2) NOT NULL,
            PaymentGateway ENUM('Credit Card', 'Bank Transfer') NOT NULL,
            ApplicationID INT NOT NULL,
            FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("Payment table created successfully")
    });
}) ;
app.get('/createCompanyPayment', (req, res) => {
    let sql = `
        CREATE TABLE CompanyPayment (
            CompanyPaymentID INT AUTO_INCREMENT PRIMARY KEY, 
            PaymentDate DATETIME NOT NULL,
            Amount DECIMAL(7,2) NOT NULL,
            CompanyID INT NOT NULL,
            PaymentID INT NOT NULL,
            FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID),
            FOREIGN KEY (PaymentID) REFERENCES Payment(PaymentID)
        )
    `;
    db.query(sql, (err, result) => {
        if (err) throw err ; 
        res.send("CompanyPayment table created successfully")
    });
}) ;

app.listen(PORT, () => {
    console.log(`your server is up and run on http://localhost:${PORT}`);
});
