/**
 * This file is app's main entry point
 */

// Import and setup modules
const express = require("express");
const app = express();
app.set("view engine", "ejs"); // Tells Express to use EJS as templating engine
app.use(express.static(__dirname + "/public")); // Set location of static files

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" })); // Set Body-parser middleware

const sqlite3 = require("sqlite3").verbose();
const dbFile = "database.db";
// global.<variable name> are accessible throughout app
global.db = new sqlite3.Database(`${dbFile}`, function (err) {
    if (err) {
        console.error(err);
        process.exit(1); // Can't connect to database, bail out
    } else {
        console.log(`Database at '${dbFile}' (from index.js) connected`);
        global.db.run("PRAGMA foreign_keys=ON"); // Tells SQLite to note foreign key constraints
    }
});

// Helper code
/**
 * If invalid database query, then do this.
 * @param {response} res Express' response object for access webpage.
 * @param {number} statusCode Status code to send out.
 * @param {string} crashId Custom crash ID to find error's exact location. (eg. `"A001"` for author or `"R001"` for readery).
 * @param {error} err Error to be console logged.
 * @returns Short message, crash ID and actual error that happened.
 */
function returnStatusCodeAndLog(res, statusCode, crashId, err) {
    return res.status(statusCode).send(`Something went wrong!<br><br>Report the error below to the support staff:<br><br>Crash ID: ${crashId}<br>${err}`);
}

/**
 * Convert datetime/timezone from UTC to local.
 * @param {datetime} datetimeFromDb UTC datetime that is given by SQLite3.
 * @returns Local datetime as a string. (eg. DD/MM/YYYY, H:MM:SS am)
 */
function returnLocalDatetime(datetimeFromDb) {
    // Add "Z" behind datetime to indicate it is UTC timezone
    return new Date(datetimeFromDb + "Z").toLocaleString();
}

// Export a module containing the following so external files can access it
module.exports = {
    returnStatusCodeAndLog,
    returnLocalDatetime,
};

/**
 * Set default locals.<variable name>
 * Must call next() to proceed with rest of code file
 */
app.use((req, res, next) => {
    res.locals.appName = "Bloggr";
    res.locals.tabNameSeparator = " | ";
    res.locals.pageName = "You forgot to set 'pageName' in this page's .ejs file!";
    next();
});

// Implementation code
/**
 * app.get()   : represents browser URL
 * res.render(): represents file to load (starts looking from views dir)
 * Import router from external file and set app's path's default prefix (eg. "/users" + "<paths within router file>")
 */
app.get("/", (req, res, next) => {
    res.render("index", { pageName: "Home (main)" });
});

// Author-related pages
const authorRouter = require("./routes/author");
app.use("/author", authorRouter);

// Reader-related pages
const readerRouter = require("./routes/reader");
app.use("/reader", readerRouter);

// Make app listen for HTTP requests
const port = 3000;
app.listen(port, () => {
    console.log(`App's server listening at http://localhost:${port}`);
});
