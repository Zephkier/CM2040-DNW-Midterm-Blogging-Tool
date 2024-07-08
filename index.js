// Import and setup modules
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const { check, validationResult } = require("express-validator");

const { db } = require("./utils/db.js");
const { statusCodeAndError } = require("./utils/middleware.js");
const indexRouter = require("./routes/index-router.js");

const app = express();

// Middleware setup
app.set("view engine", "ejs"); // Tell Express to use EJS as templating engine
app.use(express.static(__dirname + "/public")); // Set location of static files
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" })); // Increase article body's limit to 10mb
app.use(
    // Ensure session called first, and then router
    session({
        secret: "secretKey",
        saveUninitialized: false, // Do not save every session ID as some might be users who do nothing. Only save session ID of users who are logging in.
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

/**
 * app.get()          : represents browser URL endpoint
 * response.render()  : represents file to load (starts looking from views dir)
 * response.redirect(): represents browser URL endpoint (no prefix at all)
 *
 * Useful command:
 * console.log(request.session, request.session.id);
 *
 * db.get(): query to get one row of results
 * db.all(): query to get many rows of results
 * db.run(): query to update only (eg. INSERT, UPDATE, DELETE), nothing is returned
 */

// Home (main) and successful login
app.get("/", (request, response) => {
    return response.render("index.ejs", {
        pageName: "Home (main)",
        user: request.session.user, // For header-nav.ejs
        formInputStored: {}, // Empty initially
        formErrors: [], // Empty initially
        loginError: null, // Does not exist initially
    });
});

app.post(
    "/",
    [
        // check() names are from <input name>
        check("username", "Username cannot have spaces").matches(/^\S*$/, "i"),
        check("username", "Username must have at least 1 character").trim().notEmpty(),
        check("password", "Password must have at least 1 character").trim().notEmpty(),
    ],
    (request, response) => {
        const formErrors = validationResult(request); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        // If validation is bad, then re-render page with errors
        if (!formErrors.isEmpty()) {
            return response.render("index.ejs", {
                pageName: "Home (main)",
                user: request.session.user, // For header-nav.ejs
                formInputStored: {
                    // Keep current page's form input filled by creating object with same key-value pairs as user
                    username: request.body.username,
                    password: request.body.password,
                },
                formErrors: formErrors.errors, // Returns [{type, value, msg, path, location}]
                loginError: null, // Does not exist
            });
        } else {
            // Ensure user exists in database
            let queryForExistingUser = "SELECT * FROM users WHERE username = ? and password = ?";
            // Ensure params are in same order as "?" above
            let params = [request.body.username, request.body.password];
            db.get(queryForExistingUser, params, (err, existingUser) => {
                if (err) return statusCodeAndError(response, 500, "I001", err);
                if (!existingUser) {
                    return response.render("index.ejs", {
                        pageName: "Home (main)",
                        user: request.session.user, // For header-nav.ejs
                        formInputStored: {
                            // Keep current page's form input filled by creating object with same key-value pairs as user
                            username: request.body.username,
                            password: request.body.password,
                        },
                        formErrors: [], // No validation errors
                        loginError: "Either user does not exist, or invalid username/password", // Now exists
                    });
                }
                request.session.user = existingUser;
                return response.redirect("/");
            });
        }
    }
);

// Sign up
app.get("/sign-up", (request, response) => {
    return response.render("sign-up.ejs", {
        pageName: "Sign up",
        user: request.session.user, // For header-nav.ejs
        formInputStored: {}, // Empty initially
        formErrors: [], // Empty initially
        usernameError: null, // Does not exist initially
    });
});

app.post(
    "/sign-up",
    [
        // check() names are from <input name>
        check("createUser", "Username cannot have spaces").matches(/^\S*$/, "i"),
        check("createUser", "Username must have at least 1 character").trim().notEmpty(),
        check("createPass", "Password must have at least 1 character").trim().notEmpty(),
        check("createDisplayName", "Display name must have at least 1 character").trim().notEmpty(),
    ],
    (request, response) => {
        const formErrors = validationResult(request); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        // If validation is bad, then re-render page with errors
        if (!formErrors.isEmpty()) {
            return response.render("sign-up.ejs", {
                pageName: "Sign up",
                user: request.session.user, // For header-nav.ejs
                formInputStored: {
                    // Keep current page's form input filled by creating object with same key-value pairs as user
                    createUser: request.body.createUser,
                    createPass: request.body.createPass,
                    createDisplayName: request.body.createDisplayName,
                },
                formErrors: formErrors.errors, // Returns [{type, value, msg, path, location}]
                usernameError: null, // Does not exist
            });
        } else {
            // Ensure username is unique in database
            let queryForExistingUsername = "SELECT * FROM users WHERE username = ?";
            db.get(queryForExistingUsername, [request.body.createUser], (err, existingUsername) => {
                if (err) return statusCodeAndError(response, 500, "I002", err);
                // If incoming username is not unique, then re-render page with errors
                if (existingUsername) {
                    return response.render("sign-up.ejs", {
                        pageName: "Sign up",
                        user: request.session.user, // For header-nav.ejs
                        formInputStored: {
                            // Keep current page's form input filled by creating object with same key-value pairs as user
                            createUser: request.body.createUser,
                            createPass: request.body.createPass,
                            createDisplayName: request.body.createDisplayName,
                        },
                        formErrors: [], // No validation errors
                        usernameError: "Username already exists. Choose a different one.", // Now exists
                    });
                }
                // If incoming username is unique
                let queryToInsertNewUser = "INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)";
                // Ensure params are in same order as "?" above
                let params = [request.body.createUser, request.body.createPass, request.body.createDisplayName];
                db.run(queryToInsertNewUser, params, (err, newUser) => {
                    if (err) return statusCodeAndError(response, 500, "I003", err);
                    request.session.user = newUser;
                    return response.redirect("/");
                });
            });
        }
    }
);

// Logout to remove session
app.get("/logout", (request, response) => {
    request.session.destroy();
    return response.redirect("/");
});

// Use router, browser URL endpoint prefix has been set inside
app.use(indexRouter);

const port = 3000;

app.listen(port, () => {
    console.log(`App's server listening at http://localhost:${port}`);
});
