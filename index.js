// Import and setup modules
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const indexRouter = require("./routes/index-router.js");
const authorRouter = require("./routes/author.js");
const readerRouter = require("./routes/reader.js");

const port = 3000;
const app = express();

// Middleware setup
app.set("view engine", "ejs"); // Tell Express to use EJS as templating engine
app.use(express.static(__dirname + "/public")); // Set location of static files
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" })); // Increase article body's limit to 10mb
app.use(
    // Ensure session called first, and then routers
    session({
        secret: "secretKey",
        // Session id refreshes every time, so do not save every one of them
        // Only save session id of users who are logged in
        saveUninitialized: false,
        resave: false,
    })
);

// Set default locals.<variable name>, then call next() to proceed with rest of code file
app.use((request, response, next) => {
    response.locals.appName = "Blogr";
    response.locals.tabNameSeparator = " | ";
    response.locals.pageName = "You forgot to set 'pageName' in this page's .ejs file!";
    next();
});

// Use router, browser URL endpoint prefix has been set inside
app.use("/", indexRouter);
app.use("/author", authorRouter);
app.use("/reader", readerRouter);

// After every possible page above, do error-handling for invalid URLs
app.get("/:everythingElse", (request, response) => {
    return response.redirect("/");
});

app.listen(port, () => {
    console.log(`App's server listening at http://localhost:${port}`);
});
