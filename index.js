/**
 * This file is app's main entry point
 */

// Import and setup modules (global.<variable name> are accessible throughout app)
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.set("view engine", "ejs"); // Tells Express to use EJS as templating engine
app.use(express.static(__dirname + "/public")); // Set location of static files
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" })); // Set Body-parser middleware

const sqlite3 = require("sqlite3").verbose();
const dbFile = "database.db";
global.db = new sqlite3.Database(`${dbFile}`, function (err) {
    if (err) {
        console.error(err);
        process.exit(1); // Can't connect to database, bail out
    } else {
        console.log(`Database at '${dbFile}' (from index.js) connected`);
        global.db.run("PRAGMA foreign_keys=ON"); // Tells SQLite to note foreign key constraints
    }
});

// Set default locals.<variable name> for EJS files to use when they are unspecified
app.use((req, res, next) => {
    res.locals.appName = "BlogTool";
    res.locals.tabNameSeparator = " | ";
    res.locals.pageName = "You forgot to set 'pageName' in this page's .ejs file!";
    next();
});

/**
 * Access pages via GET method
 *
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
