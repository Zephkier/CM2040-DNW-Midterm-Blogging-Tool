-- Ensures that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

-- Create tables with SQL commands (watch out for slight syntactical differences with SQLite vs MySQL)
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_accounts (
    email_account_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_address TEXT NOT NULL,
    user_id INT, -- The user that the email account belongs to
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- -- Insert default data here (if necessary)

-- -- Set up 3 users
INSERT INTO users ('user_name') VALUES ('Simon Star');
INSERT INTO users ('user_name') VALUES ('Dianne Dean');
INSERT INTO users ('user_name') VALUES ('Harry Hilbert');

-- -- Give Simon 2 email addresses and Diane 1, but Harry has none
INSERT INTO email_accounts ('email_address', 'user_id') VALUES ('simon@gmail.com', 1); 
INSERT INTO email_accounts ('email_address', 'user_id') VALUES ('simon@hotmail.com', 1); 
INSERT INTO email_accounts ('email_address', 'user_id') VALUES ('dianne@yahoo.com', 2); 

COMMIT;
