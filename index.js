// Import and setup modules
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const indexRouter = require("./routes/index-router.js");
const authorRouter = require("./routes/author.js");
const readerRouter = require("./routes/reader.js");

const port = 3000;
const app = express();

/**
 * Middlware setup
 */
// Tell Express to use EJS as templating engine
app.set("view engine", "ejs");
// Set location of static files
app.use(express.static(__dirname + "/public"));
// Increase article body's limit to 10mb
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
// Ensure session called first, and then routers
app.use(
    session({
        secret: "secretKey",
        // Session id refreshes every time, so do not save every one of them
        // Only save session id of users who are logged in
        saveUninitialized: false,
        resave: false,
    })
);

/**
 * Implementation
 */
// Set default locals.variables, then call next() to proceed with rest of code file
app.use((request, response, next) => {
    response.locals.appName = "Blogr";
    response.locals.tabNameSeparator = " | ";
    response.locals.pageName = "You forgot to set 'pageName' in this page's .ejs file!";
    next();
});
// Set endpoint's (browser URL) prefix with corresponding imported router
app.use("/", indexRouter);
app.use("/author", authorRouter);
app.use("/reader", readerRouter);
// After every possible endpoint from above, handle endpoint manipulation
app.get("/:everythingElse", (request, response) => {
    return response.redirect("/");
});
// Start server
app.listen(port, () => {
    console.log(`App's server listening at http://localhost:${port}`);
});
