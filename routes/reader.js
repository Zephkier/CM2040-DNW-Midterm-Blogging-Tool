// Import and setup modules
const express = require("express");
const router = express.Router();
const { returnStatusCodeAndLog, returnLocalDatetime, returnNoTags_andShortCharLength } = require("../index");

/**
 * router.get()  : represents browser URL (has "/reader" prefix from index.js)
 * res.render()  : represents file to load (starts looking from views dir)
 * res.redirect(): represents browser URL to load
 *
 * db.get(): query to get single row of result
 * db.all(): query to get multiple rows of result
 * db.run(): query to update only (eg. INSERT, UPDATE, DELETE), nothing is returned
 */

// Home (reader) page
router.get("/", (req, res, next) => {
    let queryForSettings = "SELECT blog_title, author_name FROM settings WHERE id = 1";
    let queryForPublishedArticles = "SELECT * FROM articles WHERE category = 'published'";
    // Query to get single row of result
    global.db.get(queryForSettings, (err, settings) => {
        if (err) returnStatusCodeAndLog(res, 500, "R001", err);
        // Query to get multiple rows of result
        global.db.all(queryForPublishedArticles, (err, publishedArticles) => {
            if (err) returnStatusCodeAndLog(res, 500, "R002", err);
            // When all queries are okay
            publishedArticles.forEach((publishedArticle) => {
                // Setup body_plain as it is initially empty
                publishedArticle.body_plain = returnNoTags_andShortCharLength(publishedArticle.body);
                // Convert datetimes from (SQLite3's default) UTC to local
                publishedArticle.date_created = returnLocalDatetime(publishedArticle.date_created);
                publishedArticle.date_modified = returnLocalDatetime(publishedArticle.date_modified);
            });
            // Pass query results to display in webpage
            res.render("reader/home", {
                pageName: "Home (reader)",
                settings: settings,
                publishedArticles: publishedArticles,
            });
        });
    });
});

// Read article page - no chosen article by default
router.get("/read-article", (req, res, next) => {
    let queryForBlogTitle = "SELECT blog_title FROM settings WHERE id = 1";
    // Query to get single row of result
    global.db.get(queryForBlogTitle, (err, blogTitle) => {
        if (err) returnStatusCodeAndLog(res, 500, "R003", err);
        // When all queries are okay (pass query results to display in webpage)
        res.render("reader/read-article", {
            pageName: "Read Article",
            blogTitle: blogTitle,
            chosenArticle: [{ title: "No article chosen to read!" }],
        });
    });
});

// Read article page - upon a chosen article
router.get("/read-article/:chosenId", (req, res, next) => {
    let chosenId = req.params.chosenId; // Get param from URL
    let queryForBlogTitle = "SELECT blog_title FROM settings WHERE id = 1";
    let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
    // Query to get single row of result
    global.db.get(queryForBlogTitle, (err, blogTitle) => {
        if (err) returnStatusCodeAndLog(res, 500, "R004", err);
        // Query to get multiple rows of result
        global.db.all(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
            if (err) returnStatusCodeAndLog(res, 500, "R005", err);
            // When all queries are okay (pass query results to display in webpage)
            res.render("reader/read-article", {
                pageName: "Read Article",
                blogTitle: blogTitle,
                chosenArticle: chosenArticle,
            });
        });
    });
});

// Export a module containing the following so external files (index.js) can access it
module.exports = router;
