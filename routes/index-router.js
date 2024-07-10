// Import and setup modules
const express = require("express");
const { check, validationResult } = require("express-validator");
const { db } = require("../utils/db.js");
const { errorPage } = require("../utils/middleware.js");

const router = express.Router();

/**
 * app.get() or router.get(): represents browser URL endpoint
 * response.render()        : represents file to load (starts looking from views dir)
 * response.redirect()      : represents browser URL endpoint (no prefix at all)
 *
 * Useful commands:
 * console.log(request.session, request.session.id)
 * <a href> does GET requests only
 * <button name> returns its <button value> when clicked
 *
 * db.get(): query to get one row of results
 * db.all(): query to get many rows of results
 * db.run(): query to update only (eg. INSERT, UPDATE, DELETE), nothing is returned
 */

// Home (main), login, successful login
router.get("/", (request, response) => {
    return response.render("index.ejs", {
        pageName: "Home (main)",
        user: request.session.user, // For header-nav.ejs
        formInputStored: {}, // Empty initially
        formErrors: [], // Empty initially
        loginError: null, // Does not exist initially
    });
});

router.post(
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
                if (err) return errorPage(response, 500, "I001", err);
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
router.get("/sign-up", (request, response) => {
    // Ensure users cannot access this
    if (request.session.user) return response.redirect("/");

    return response.render("sign-up.ejs", {
        pageName: "Sign up",
        user: request.session.user, // For header-nav.ejs
        formInputStored: {}, // Empty initially
        formErrors: [], // Empty initially
        usernameError: null, // Does not exist initially
    });
});

router.post(
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
                if (err) return errorPage(response, 500, "I002", err);
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
                    if (err) return errorPage(response, 500, "I003", err);
                    request.session.user = newUser;
                    return response.redirect("/");
                });
            });
        }
    }
);

// Logout, goes to home (main)
router.get("/logout", (request, response) => {
    request.session.destroy();
    return response.redirect("/");
});

// Export module containing the following so external files can access it
module.exports = router;
