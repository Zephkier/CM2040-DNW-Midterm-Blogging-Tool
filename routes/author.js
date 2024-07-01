const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();

/**
 * Upon error executing query, console log and redirect to specified URL
 * @param {response} res Express' response object for accessing web pages
 * @param {error} err Error/Item to be console logged
 * @param {string} url Browser URL to be redirected to
 */
function logAndRedirect(res, err, url) {
    console.log(err);
    res.redirect(url);
}

/**
 * Execute `SELECT` query that returns multiple rows of results.
 * @param {string} query Query to be executed
 * @returns If query succeeds, then Promise resolves to an array of rows.
 *          If query fails, then Promise rejects with an error.
 */
function executeQuery(query) {
    return new Promise((resolve, reject) => {
        global.db.all(query, function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Execute `SELECT` query that returns 1 row of result without params.
 * @param {string} query Query to be executed
 * @returns If query succeeds, then Promise resolves to 1 row object.
 *          If query fails, then Promise rejects with an error.
 */
function executeGetQuery(query) {
    return new Promise((resolve, reject) => {
        global.db.get(query, function (err, row) {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Execute `SELECT` query that returns 1 row of result with params (eg. querying its unique id).
 * @param {string} query Query to be executed
 * @param {Array} params Parameters for the query
 * @returns If query succeeds, then Promise resolves to 1 row object.
 *          If query fails, then Promise rejects with an error.
 */
function executeGetQueryWithParams(query, params) {
    return new Promise((resolve, reject) => {
        global.db.get(query, params, function (err, row) {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Execute `INSERT` / `UPDATE` / `DELETE` queries that does not return anything.
 * @param {string} query Query to be executed
 * @param {array} params Parameters for the query
 * @returns If query succeeds, then Promise resolves.
 *          If query fails, then Promise rejects with an error.
 */
function executeRunQuery(query, params) {
    return new Promise((resolve, reject) => {
        global.db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

/**
 * router.get()  : represents browser URL (has "/author" prefix from index.js)
 * res.render()  : represents file to load (starts looking from views dir)
 * res.redirect(): represents browser URL to load
 */

let path = "author/";

// Home (author) page
router.get("/", (req, res, next) => {
    let queryForSettings = "SELECT blog_title, author_name FROM settings WHERE id = 1";
    let queryForDraftArticles = "SELECT * FROM articles WHERE category = 'draft'";
    let queryForPublishedArticles = "SELECT * FROM articles WHERE category = 'published'";

    let tableColumnTitles = ["Title", "Subtitle", "Created", "Last modified", "Actions"];

    // Execute queries completely
    Promise.all([executeGetQuery(queryForSettings), executeQuery(queryForDraftArticles), executeQuery(queryForPublishedArticles)])
        // Then render page using query results
        .then((results) => {
            const [settings, draftArticles, publishedArticles] = results; // Ensure element's order matches queries' above
            res.render(path + "author-index", {
                pageName: "Home (author)",
                settings: settings,
                tableColumnTitles: tableColumnTitles,
                draftArticles: draftArticles,
                publishedArticles: publishedArticles,
            });
        })
        // If error executing query, then log and redirect to home (main) page
        .catch((err) => {
            logAndRedirect(err, "/");
        });
});

// Settings page
router.get("/settings", (req, res, next) => {
    let queryForSettings = "SELECT blog_title, author_name FROM settings WHERE id = 1";

    // Execute query completely
    executeGetQuery(queryForSettings)
        // Then render page using query results
        .then((results) => {
            res.render(path + "author-settings", {
                pageName: "Settings",
                settings: results,
                formErrors: [], // Empty initially, as there are no errors in the form
            });
        })
        // If error executing query, then redirect to home (main) page
        .catch((err) => {
            logAndRedirect(err, "/");
        });
});

router.post(
    "/settings",
    [
        // Format
        check("blogTitle", "Blog's title must have at least 1 character").isLength({ min: 1 }),
        check("authorName", "Author's name must have at least 1 character").isLength({ min: 1 }),
    ],
    (req, res) => {
        const formErrors = validationResult(req); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        if (formErrors.isEmpty()) {
            // When validation is good
            let updateQuery = "UPDATE settings SET blog_title = ?, author_name = ? WHERE id = 1";
            let paramsFromWebpage = [req.body.blogTitle, req.body.authorName]; // Ensure element's order matches query's above
            // Execute query completely
            executeRunQuery(updateQuery, paramsFromWebpage)
                // Then redirect to home (author) page to see updated changes
                .then(res.redirect("/author"))
                // If error executing query, then log and refresh page
                .catch((err) => {
                    logAndRedirect(err, "/author/settings");
                });
        } else {
            // When validation is bad
            res.render(path + "author-settings", {
                pageName: "Settings",
                settings: req.body, // Uses current page's data to keep valid forms untouched
                formErrors: formErrors.errors, // This is now filled via the returned [{type, value, msg, path, location}]
            });
        }
    }
);

// New article page
router.get("/article-new", (req, res, next) => {
    res.render(path + "author-article-new", {
        pageName: "New Article",
        body: undefined,
        formErrors: [], // Empty initially, as there are no errors in the form
    });
});

router.post(
    "/article-new",
    [
        // Format
        check("articleTitle", "Title must have at least 1 character").isLength({ min: 1 }),
        check("articleBody", "Body must have at least 1 character").isLength({ min: 1 }),
    ],
    (req, res) => {
        const formErrors = validationResult(req);
        if (formErrors.isEmpty()) {
            // When validation is good
            let insertQuery = "INSERT INTO articles (category, title, subtitle, body) VALUES ('draft', ?, ?, ?)";
            let paramsFromWebpage = [req.body.articleTitle, req.body.articleSubtitle, req.body.articleBody];
            // Execute query completely
            executeRunQuery(insertQuery, paramsFromWebpage)
                // Then redirect to home (author) page to see updated changes
                .then(res.redirect("/author"))
                // If error executing query, then log and refresh page
                .catch((err) => {
                    logAndRedirect(res, err, "/author/article-new");
                });
        } else {
            // When validation is bad
            res.render(path + "author-article-new", {
                pageName: "New Article",
                body: req.body, // Uses current page's data to keep valid forms untouched
                formErrors: formErrors.errors, // This is now filled via the returned [{type, value, msg, path, location}]
            });
        }
    }
);

// Edit article page
router.get("/article-edit/:id", (req, res, next) => {
    let chosenId = req.params.id; // Get id from URL when clicking 'edit' button at home (author) page
    let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";

    // Execute query completely
    executeGetQueryWithParams(queryForChosenArticle, [chosenId])
        // Then render page using query results
        .then((results) => {
            res.render(path + "author-article-edit", {
                pageName: "Edit Article",
                chosenArticle: results,
                formErrors: [], // Empty initially, as there are no errors in the form
            });
        })
        // If error executing query, then log and refresh page
        .catch((err) => {
            logAndRedirect(res, err, "/author/article-edit/:id");
        });
});

router.post(
    "/article-edit/:id",
    [
        // Format
        check("articleTitle", "Title must have at least 1 character").isLength({ min: 1 }),
        check("articleBody", "Body must have at least 1 character").isLength({ min: 1 }),
    ],
    (req, res) => {
        const formErrors = validationResult(req);
        const chosenId = req.params.id;
        if (formErrors.isEmpty()) {
            // When validation is good
            let updateQuery = "UPDATE articles SET title = ?, subtitle = ?, body = ?, datetime_last_modified = CURRENT_TIMESTAMP WHERE id = ?";
            let paramsFromWebpage = [req.body.articleTitle, req.body.articleSubtitle, req.body.articleBody, chosenId];
            // Execute query completely
            executeRunQuery(updateQuery, paramsFromWebpage)
                // Then redirect to home (author) page to see updated changes
                .then(() => res.redirect("/author"))
                // If error executing query, then log and refresh page
                .catch((err) => {
                    logAndRedirect(res, err, `/author/article-edit/${chosenId}`);
                });
        } else {
            // When validation is bad
            const chosenArticle = {
                id: chosenId,
                title: req.body.articleTitle,
                subtitle: req.body.articleSubtitle,
                body: req.body.articleBody,
            };
            res.render(path + "author-article-edit", {
                pageName: "Edit Article",
                chosenArticle: chosenArticle, // Uses current page's data to keep valid forms untouched
                formErrors: formErrors.errors, // This is now filled via the returned [{type, value, msg, path, location}]
            });
        }
    }
);

// Export this router so index.js can access it
module.exports = router;
