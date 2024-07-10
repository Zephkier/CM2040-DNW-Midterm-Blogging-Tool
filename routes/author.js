// Import and setup modules
const express = require("express");
const { check, validationResult } = require("express-validator");
const { db } = require("../utils/db.js");
const { statusCodeAndError, returnUTCtoLocalDatetime, returnShortenAndStripped } = require("../utils/middleware.js");

const router = express.Router();

/**
 * app.get()          : represents browser URL endpoint (has "/author" prefix from index-router.js)
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

// Home (author), create blog, view all articles
router.get("/", (request, response) => {
    // Ensure non-users cannot access this
    if (!request.session.user) return response.redirect("/");

    // Users without blogs (because they just signed up) are to create one
    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return statusCodeAndError(response, 500, "A001", err);
        if (!blogInfo) return response.redirect("/author/create-blog");

        // Users with blogs can view all articles
        let queryForArticlesFromBlog = `
            SELECT * FROM articles
            WHERE blog_id = ?
            ORDER BY date_modified DESC`;
        db.all(queryForArticlesFromBlog, [blogInfo.id], (err, articlesFromBlog) => {
            if (err) return statusCodeAndError(response, 500, "A002", err);
            // Order is [draft], [published], [deleted]
            let allArticles = [[], [], []];
            articlesFromBlog.forEach((article) => {
                // Setup body_plain as it is empty initially
                article.body_plain = returnShortenAndStripped(article.body);
                // Use <br> so it can be applied in frontend, must use <%- %>
                article.date_created = returnUTCtoLocalDatetime(article.date_created).replace().replace(", ", "<br>");
                article.date_modified = returnUTCtoLocalDatetime(article.date_modified).replace(", ", "<br>");
                // Filter into different categories
                if (article.category == "draft") allArticles[0].push(article);
                else if (article.category == "published") allArticles[1].push(article);
                else if (article.category == "deleted") allArticles[2].push(article);
            });

            return response.render("author/home.ejs", {
                pageName: "Home (author)",
                user: request.session.user,
                blog: blogInfo,
                articleCategories: ["Draft", "Published", "Deleted"],
                tableHeaders: ["Title", "Subtitle", "Views", "Likes", "Date created", "Date modified", "Actions"],
                allArticles: allArticles,
            });
        });
    });
});

// Action buttons not including "Edit" button at .get("/article")
router.post("/", (request, response) => {
    let queryToUpdateOrDelete = "";
    if (request.body.thisReturnsItsValue == "delete-permanently") queryToUpdateOrDelete = "DELETE from articles WHERE id = ?";
    else queryToUpdateOrDelete = `UPDATE articles SET category = '${request.body.thisReturnsItsValue}' WHERE id = ?`;
    db.run(queryToUpdateOrDelete, [request.body.chosenId], (err) => {
        if (err) return statusCodeAndError(response, 500, "A003", err);
        return response.redirect("/author");
    });
});

// Create blog for users without one
router.get("/create-blog", (request, response) => {
    // Ensure non-users cannot access this
    if (!request.session.user) return response.redirect("/");

    // Ensure users WITH blogs cannot access this (redirect them to view all articles)
    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return statusCodeAndError(response, 500, "A004", err);
        if (blogInfo) return response.redirect("/author");

        return response.render("author/create-blog.ejs", {
            pageName: "Create blog",
            user: request.session.user,
            formInputStored: {},
            formErrors: [],
        });
    });
});

router.post("/create-blog", [check("createBlogTitle", "Title must have at least 1 character").trim().notEmpty()], (request, response) => {
    const formErrors = validationResult(request); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
    // If validation is bad, then re-render page with errors
    if (!formErrors.isEmpty()) {
        return response.render("author/create-blog.ejs", {
            pageName: "Create blog",
            user: request.session.user,
            formInputStored: { createBlogTitle: request.body.createBlogTitle },
            formErrors: formErrors.errors, // Returns [{type, value, msg, path, location}]
        });
    } else {
        let queryToCreateBlogTitle = "INSERT INTO blogs (title, user_id) VALUES (?, ?)";
        let params = [request.body.createBlogTitle, request.session.user.id];
        db.run(queryToCreateBlogTitle, params, (err) => {
            if (err) statusCodeAndError(response, 500, "A005", err);
            return response.redirect("/author");
        });
    }
});

// Settings
router.get("/settings", (request, response) => {
    // Ensure non-users cannot access this
    if (!request.session.user) return response.redirect("/");

    // Ensure users without blogs cannot access this (redirect them to create a blog)
    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return statusCodeAndError(response, 500, "A006", err);
        if (!blogInfo) return response.redirect("/author/create-blog");

        return response.render("author/settings.ejs", {
            pageName: "Settings",
            user: request.session.user,
            formInputStored: {
                blogTitle: blogInfo.title,
                displayName: blogInfo.display_name,
            },
            formErrors: [],
        });
    });
});

router.post(
    "/settings",
    [
        // Format
        check("blogTitle", "Title must have at least 1 character").trim().notEmpty(),
        check("displayName", "Name must have at least 1 character").trim().notEmpty(),
    ],
    (request, response) => {
        const formErrors = validationResult(request); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        // If validation is bad, then re-render page with errors
        if (!formErrors.isEmpty()) {
            return response.render("author/settings.ejs", {
                pageName: "Settings",
                user: request.session.user,
                formInputStored: {
                    blogTitle: request.body.blogTitle,
                    displayName: request.body.displayName,
                },
                formErrors: formErrors.errors, // Returns [{type, value, msg, path, location}]
            });
        } else {
            let queryToUpdateBlogTitle = "UPDATE blogs SET title = ? WHERE user_id = ?";
            let params = [request.body.blogTitle, request.session.user.id];
            db.run(queryToUpdateBlogTitle, params, (err) => {
                if (err) statusCodeAndError(response, 500, "A007", err);
                let queryToUpdateDisplayName = "UPDATE users SET display_name = ? WHERE id = ?";
                db.run(queryToUpdateDisplayName, [request.body.displayName, request.session.user.id], (err) => {
                    if (err) statusCodeAndError(response, 500, "A008", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

// Article, create new article by default
router.get("/article", (request, response) => {
    // Ensure non-users cannot access this
    if (!request.session.user) return response.redirect("/");

    // Ensure users without blogs cannot access this (redirect them to create a blog)
    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return statusCodeAndError(response, 500, "A009", err);
        if (!blogInfo) return response.redirect("/author/create-blog");

        return response.render("author/article.ejs", {
            pageName: "Create new article",
            user: request.session.user,
            formInputStored: {},
            formErrors: [],
        });
    });
});

router.post(
    "/article",
    [
        // Format
        check("articleTitle", "Title must have at least 1 character").trim().notEmpty(),
        check("articleBody", "Body must have at least 1 character").trim().notEmpty(),
    ],
    (request, response) => {
        const formErrors = validationResult(request); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        // If validation is bad, then re-render page with errors
        if (!formErrors.isEmpty()) {
            return response.render("author/article.ejs", {
                pageName: "Create new article",
                user: request.session.user,
                formInputStored: request.body,
                formErrors: formErrors.errors, // Returns [{type, value, msg, path, location}]
            });
        } else {
            // Do this first to get blogs.id
            let queryForBlogId = "SELECT id FROM blogs WHERE user_id = ?";
            db.get(queryForBlogId, [request.session.user.id], (err, blogId) => {
                if (err) return statusCodeAndError(response, 500, "A010", err);
                if (!blogId) return statusCodeAndError(response, 400, "A011", new Error("Blog not found"));
                // So that article can be inserted into the correct blog via blogs.id
                let queryToInsertArticle = `
                INSERT INTO
                    articles (category, title, subtitle, body, body_plain, blog_id)
                VALUES
                    (?, ?, ?, ?, ?, ?)`;
                let params = [
                    request.body.thisReturnsItsValue,
                    request.body.articleTitle,
                    request.body.articleSubtitle,
                    request.body.articleBody,
                    returnShortenAndStripped(request.body.articleBody), // Get its plain version
                    blogId.id,
                ];
                db.run(queryToInsertArticle, params, (err) => {
                    if (err) statusCodeAndError(response, 500, "A012", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

// Article, edit draft/published article (:chosenId is retrieved upon clicking "Edit" button)
router.get("/article/:chosenId", (request, response) => {
    // Ensure non-users cannot access this
    if (!request.session.user) return response.redirect("/");

    // Ensure users without blogs cannot access this (redirect them to create a blog)
    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return statusCodeAndError(response, 500, "A013", err);
        if (!blogInfo) return response.redirect("/author/create-blog");

        let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
        let chosenId = request.params.chosenId; // Get param from URL
        db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
            if (err) statusCodeAndError(response, 500, "A014", err);
            response.render("author/article.ejs", {
                pageName: `Edit ${chosenArticle.category} article`, // Differentiate editing draft or published articles
                user: request.session.user,
                formInputStored: {
                    chosenId: chosenId,
                    articleTitle: chosenArticle.title,
                    articleSubtitle: chosenArticle.subtitle,
                    articleBody: chosenArticle.body,
                },
                formErrors: [],
            });
        });
    });
});

router.post(
    "/article/:chosenId",
    [
        // Format
        check("articleTitle", "Title must have at least 1 character").trim().notEmpty(),
        check("articleBody", "Body must have at least 1 character").trim().notEmpty(),
    ],
    (request, response) => {
        const formErrors = validationResult(request); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
        // If validation is bad, then re-render page with errors
        if (!formErrors.isEmpty()) {
            let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
            let chosenId = request.params.chosenId; // Get param from URL
            db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
                if (err) statusCodeAndError(response, 500, "A015", err);
                return response.render("author/article.ejs", {
                    pageName: `Edit ${chosenArticle.category} article`, // Differentiate editing draft or published articles
                    user: request.session.user,
                    formInputStored: {
                        chosenId: chosenId,
                        articleTitle: request.body.articleTitle,
                        articleSubtitle: request.body.articleSubtitle,
                        articleBody: request.body.articleBody,
                    },
                    formErrors: formErrors.errors, // Returns [{type, value, msg, path, location}]
                });
            });
        } else {
            // Do this first to get blogs.id
            let queryForBlogId = "SELECT id FROM blogs WHERE user_id = ?";
            db.get(queryForBlogId, [request.session.user.id], (err, blogId) => {
                if (err) return statusCodeAndError(response, 500, "A016", err);
                if (!blogId) return statusCodeAndError(response, 400, "A017", new Error("Blog not found"));
                // So that article can be inserted into the correct blog via blogs.id
                let queryToUpdateArticle = `
                    UPDATE articles
                    SET
                        category = ?, title = ?, subtitle = ?, body = ?, body_plain = ?,
                        date_modified = CURRENT_TIMESTAMP, blog_id = ?
                    WHERE
                        id = ?`;
                let params = [
                    request.body.thisReturnsItsValue,
                    request.body.articleTitle,
                    request.body.articleSubtitle,
                    request.body.articleBody,
                    returnShortenAndStripped(request.body.articleBody), // Get its plain version
                    blogId.id,
                    request.params.chosenId,
                ];
                db.run(queryToUpdateArticle, params, (err) => {
                    if (err) statusCodeAndError(response, 500, "A018", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

// Export module containing the following so external files can access it
module.exports = router;
