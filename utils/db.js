// Import and setup modules
const sqlite3 = require("sqlite3").verbose();

const dbFile = "./database.db";
const db = new sqlite3.Database(`${dbFile}`, function (err) {
    if (err) {
        // If can't connect to database, then bail out
        console.error(err);
        process.exit(1);
    } else {
        console.log(`Database at '${dbFile}' connected`);
        db.run("PRAGMA foreign_keys=ON"); // Tells SQLite to note foreign key constraints
    }
});

// Export module containing the following so external files can access it
module.exports = { db };
