// Import and setup modules
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const { returnStatusCodeAndLog, returnLocalDatetime, returnNoTags_andShortCharLength } = require("../index");

/**
 * router.get()  : represents browser URL (has "/author" prefix from index.js)
 * res.render()  : represents file to load (starts looking from views dir)
 * res.redirect(): represents browser URL to load
 *
 * db.get(): query to get single row of result
 * db.all(): query to get multiple rows of result
 * db.run(): query to update only (eg. INSERT, UPDATE, DELETE), nothing is returned
 */

// Home (author) page (publish, unpublish and delete implementations are below)
router.get("/", (req, res, next) => {
    let queryForSettings = "SELECT blog_title, author_name FROM settings WHERE id = 1";
    let queryForCategoryOfArticles = "SELECT * FROM articles WHERE category = ?";
    // Query to get single row of result
    global.db.get(queryForSettings, (err, settings) => {
        if (err) returnStatusCodeAndLog(res, 500, "A001", err);
        // Query to get multiple rows of result
        global.db.all(queryForCategoryOfArticles, ["draft"], (err, draftArticles) => {
            if (err) returnStatusCodeAndLog(res, 500, "A002", err);
            // Query to get multiple rows of result
            global.db.all(queryForCategoryOfArticles, ["published"], (err, publishedArticles) => {
                if (err) returnStatusCodeAndLog(res, 500, "A003", err);
                global.db.all(queryForCategoryOfArticles, ["deleted"], (err, deletedArticles) => {
                    if (err) returnStatusCodeAndLog(res, 500, "A012", err);
                    // When all queries are okay
                    // Convert datetimes from (SQLite3's default) UTC to local
                    let allCategoriesOfArticles = [draftArticles, publishedArticles, deletedArticles];
                    allCategoriesOfArticles.forEach((categoryOfArticles) => {
                        categoryOfArticles.forEach((article) => {
                            // Setup body_plain as it is initially empty
                            article.body_plain = returnNoTags_andShortCharLength(article.body);
                            // Use <br> and not \n, so EJS can apply line break, and in EJS file, must use <%- %> to apply HTML tags
                            article.date_created = returnLocalDatetime(article.date_created).replace(", ", "<br>");
                            article.date_modified = returnLocalDatetime(article.date_modified).replace(", ", "<br>");
                        });
                    });
                    // Pass query results to display in webpage
                    res.render("author/home", {
                        pageName: "Home (author)",
                        settings: settings,
                        tableCategories: ["Draft", "Published", "Deleted"],
                        tableHeaders: ["Title", "Subtitle", "Views", "Likes", "Date created", "Date modified", "Actions"],
                        allCategoriesOfArticles: allCategoriesOfArticles,
                    });
                });
            });
        });
    });
});

// Settings page
router.get("/settings", (req, res, next) => {
    let queryForSettings = "SELECT blog_title, author_name FROM settings WHERE id = 1";
    // Query to get single row of result
    global.db.get(queryForSettings, (err, settings) => {
        if (err) returnStatusCodeAndLog(res, 500, "A004", err);
        res.render("author/settings", {
            pageName: "Settings",
            settings: settings, // Pass query results to display in form
            formErrors: [], // Empty as there are no errors in form
        });
    });
});

router.post(
    "/settings",
    [
        // Format
        check("blogTitle", "Title must have at least 1 character").isLength({ min: 1 }),
        check("authorName", "Name must have at least 1 character").isLength({ min: 1 }),
    ],
    (req, res) => {
        const formErrors = validationResult(req); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        // When form validation is bad
        if (!formErrors.isEmpty()) {
            // Create object that replicates settings using values from current page's form inputs
            let formInputStored = {
                blog_title: req.body.blogTitle,
                author_name: req.body.authorName,
            };
            return res.render("author/settings", {
                pageName: "Settings",
                settings: formInputStored, // Pass current page's form inputs to keep it intact
                formErrors: formErrors.errors, // Pass validation errors, formErrors.errors = [{type, value, msg, path, location}]
            });
        }
        // When form validation is good
        let updateQuery = "UPDATE settings SET blog_title = ?, author_name = ? WHERE id = 1";
        let paramsFromWebpage = [req.body.blogTitle, req.body.authorName]; // Ensure element's order matches that of query's
        // Query to update only, nothing is returned
        global.db.run(updateQuery, paramsFromWebpage, (err) => {
            if (err) returnStatusCodeAndLog(res, 500, "A005", err);
            res.redirect("/author");
        });
    }
);

// Article page - create new article by default
router.get("/article", (req, res, next) => {
    res.render("author/article", {
        pageName: "Create New Article",
        formInput: "", // Empty as this is creating new article
        formErrors: [], // Empty as there are no errors in form
    });
});

router.post(
    "/article",
    [
        // Format
        check("articleTitle", "Title must have at least 1 character").isLength({ min: 1 }),
        check("articleBody", "Body must have at least 1 character").isLength({ min: 1 }),
    ],
    (req, res) => {
        const formErrors = validationResult(req); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        // When validation is bad
        if (!formErrors.isEmpty()) {
            return res.render("author/article", {
                pageName: "Create New Article",
                formInput: req.body, // Pass current page's form inputs to keep it intact
                formErrors: formErrors.errors, // Pass validation errors, formErrors.errors = [{type, value, msg, path, location}]
            });
        }
        // When validation is good
        let insertQuery = "INSERT INTO articles (category, title, subtitle, body, body_plain) VALUES (?, ?, ?, ?, ?)";
        let updatedBodyPlain = returnNoTags_andShortCharLength(req.body.articleBody);
        let paramsFromWebpage = [req.body.thisReturnsValue, req.body.articleTitle, req.body.articleSubtitle, req.body.articleBody, updatedBodyPlain];
        // Query to update only, nothing is returned
        global.db.run(insertQuery, paramsFromWebpage, (err) => {
            if (err) returnStatusCodeAndLog(res, 500, "A006", err);
            res.redirect("/author");
        });
    }
);

// Article page - edit article, its content is filled by default (:chosenId is retrieved upon clicking "Edit" button from home (author) page)
router.get("/article/:chosenId", (req, res, next) => {
    let chosenId = req.params.chosenId; // Get param from URL
    let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
    global.db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
        if (err) returnStatusCodeAndLog(res, 500, "A007", err);
        // Create object that replicates formInput using values from query results
        let formInputStored = {
            chosenId: chosenId,
            articleCategory: chosenArticle.category.charAt(0).toUpperCase() + chosenArticle.category.slice(1),
            articleTitle: chosenArticle.title,
            articleSubtitle: chosenArticle.subtitle,
            articleBody: chosenArticle.body,
        };
        res.render("author/article", {
            pageName: `Edit ${formInputStored.articleCategory} Article`, // Differentiate editing draft or published articles
            formInput: formInputStored, // Pass query results to display in form
            formErrors: [], // Empty as there are no errors in form
        });
    });
});

router.post(
    "/article/:chosenId",
    [
        // Format
        check("articleTitle", "Title must have at least 1 character").isLength({ min: 1 }),
        check("articleBody", "Body must have at least 1 character").isLength({ min: 1 }),
    ],
    (req, res) => {
        const formErrors = validationResult(req); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        const chosenId = req.params.chosenId;
        // When validation is bad
        if (!formErrors.isEmpty()) {
            // Create object that replicates formInput using values from current page's form inputs
            let formInputStored = {
                chosenId: chosenId,
                articleTitle: req.body.articleTitle,
                articleSubtitle: req.body.articleSubtitle,
                articleBody: req.body.articleBody,
            };
            return res.render("author/article", {
                pageName: `Edit ${formInputStored.articleCategory} Article`, // Differentiate editing draft or published articles
                formInput: formInputStored, // Pass current page's form inputs to keep it intact
                formErrors: formErrors.errors, // Pass validation errors, formErrors.errors = [{type, value, msg, path, location}]
            });
        }
        // When validation is good
        let updateQuery = "UPDATE articles SET category = ?, title = ?, subtitle = ?, body = ?, body_plain = ?, date_modified = CURRENT_TIMESTAMP WHERE id = ?";
        let updatedBodyPlain = returnNoTags_andShortCharLength(req.body.articleBody);
        let paramsFromWebpage = [req.body.thisReturnsValue, req.body.articleTitle, req.body.articleSubtitle, req.body.articleBody, updatedBodyPlain, chosenId]; // Ensure element's order matches that of query's
        // Query to update only, nothing is returned
        global.db.run(updateQuery, paramsFromWebpage, (err) => {
            if (err) returnStatusCodeAndLog(res, 500, "A008", err);
            res.redirect("/author");
        });
    }
);

// Home (author) page action buttons ("Edit" button is above)
router.post("/publish", (req, res, next) => {
    let updateQuery = "UPDATE articles SET category = 'published' WHERE id = ?";
    // Query to update only, nothing is returned
    global.db.run(updateQuery, [req.body.chosenId], (err) => {
        if (err) return returnStatusCodeAndLog(res, 500, "A009", err);
        res.redirect("/author");
    });
});

router.post("/unpublish", (req, res, next) => {
    let updateQuery = "UPDATE articles SET category = 'draft' WHERE id = ?";
    // Query to update only, nothing is returned
    global.db.run(updateQuery, [req.body.chosenId], (err) => {
        if (err) return returnStatusCodeAndLog(res, 500, "A010", err);
        res.redirect("/author");
    });
});

router.post("/delete", (req, res, next) => {
    let updateQuery = "UPDATE articles SET category = 'deleted' WHERE id = ?";
    // Query to update only, nothing is returned
    global.db.run(updateQuery, [req.body.chosenId], (err) => {
        if (err) return returnStatusCodeAndLog(res, 500, "A011", err);
        res.redirect("/author");
    });
});

router.post("/delete-permanently", (req, res, next) => {
    let deleteQuery = "DELETE from articles WHERE id = ?";
    // Query to update only, nothing is returned
    global.db.run(deleteQuery, [req.body.chosenId], (err) => {
        if (err) return returnStatusCodeAndLog(res, 500, "A013", err);
        res.redirect("/author");
    });
});

router.post("/recover", (req, res, next) => {
    let updateQuery = "UPDATE articles SET category = 'draft' WHERE id = ?";
    // Query to update only, nothing is returned
    global.db.run(updateQuery, [req.body.chosenId], (err) => {
        if (err) return returnStatusCodeAndLog(res, 500, "A014", err);
        res.redirect("/author");
    });
});

// Export a module containing the following so external files (index.js) can access it
module.exports = router;
