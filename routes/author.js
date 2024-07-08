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

// Home (author), straight to article page
router.get("/", (request, response) => {
    if (!request.session.user) return response.redirect("/");

    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        // If implementing one-user : many-blogs, then can do it here
        // Ensure to change from .get() to .all()
        // But i'm not going to, in case of overworking and time contraints
        if (err) return statusCodeAndError(response, 500, "A001", err);
        if (!blogInfo) return response.send("author.js @ line 36: Allow new users to create 1 new blog!"); // TODO
        let queryForArticlesFromBlog = "SELECT * FROM articles WHERE blog_id = ?";
        db.all(queryForArticlesFromBlog, [blogInfo.id], (err, articlesFromBlog) => {
            if (err) return statusCodeAndError(response, 500, "A001", err);
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

// Home (author), action buttons not including "Edit" button
// "Edit" button is found @ line 223 (comment = "Article, edit article")
router.post("/publish", (request, response) => {
    let queryToUpdateCategory = "UPDATE articles SET category = 'published' WHERE id = ?";
    db.run(queryToUpdateCategory, [request.body.chosenId], (err) => {
        if (err) return statusCodeAndError(response, 500, "A009", err);
        return response.redirect("/author");
    });
});

router.post("/unpublish", (request, response) => {
    let queryToUpdateCategory = "UPDATE articles SET category = 'draft' WHERE id = ?";
    db.run(queryToUpdateCategory, [request.body.chosenId], (err) => {
        if (err) return statusCodeAndError(response, 500, "A010", err);
        return response.redirect("/author");
    });
});

router.post("/delete", (request, response) => {
    let queryToUpdateCategory = "UPDATE articles SET category = 'deleted' WHERE id = ?";
    db.run(queryToUpdateCategory, [request.body.chosenId], (err) => {
        if (err) return statusCodeAndError(response, 500, "A011", err);
        return response.redirect("/author");
    });
});

router.post("/delete-permanently", (request, response) => {
    let queryToDelete = "DELETE from articles WHERE id = ?";
    db.run(queryToDelete, [request.body.chosenId], (err) => {
        if (err) return statusCodeAndError(response, 500, "A013", err);
        return response.redirect("/author");
    });
});

router.post("/recover", (request, response) => {
    let queryToUpdateCategory = "UPDATE articles SET category = 'draft' WHERE id = ?";
    db.run(queryToUpdateCategory, [request.body.chosenId], (err) => {
        if (err) return statusCodeAndError(response, 500, "A014", err);
        return response.redirect("/author");
    });
});

// Settings
router.get("/settings", (request, response) => {
    if (!request.session.user) return response.redirect("/");

    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return statusCodeAndError(response, 500, "A001", err);
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
                if (err) statusCodeAndError(response, 500, "A001", err);
                let queryToUpdateDisplayName = "UPDATE users SET display_name = ? WHERE id = ?";
                db.run(queryToUpdateDisplayName, [request.body.displayName, request.session.user.id], (err) => {
                    if (err) statusCodeAndError(response, 500, "A001", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

// Article, default is create new article
router.get("/article", (request, response) => {
    if (!request.session.user) return response.redirect("/");

    return response.render("author/article.ejs", {
        pageName: "Create new article",
        user: request.session.user,
        formInputStored: {},
        formErrors: [],
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
                if (err) return statusCodeAndError(response, 500, "A006", err);
                if (!blogId) return statusCodeAndError(response, 400, "A007", new Error("Blog not found"));
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
                    if (err) statusCodeAndError(response, 500, "A006", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

// Article, edit article (:chosenId is retrieved upon clicking "Edit" action button from home (author))
router.get("/article/:chosenId", (request, response) => {
    if (!request.session.user) return response.redirect("/");

    let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
    let chosenId = request.params.chosenId; // Get param from URL
    db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
        if (err) statusCodeAndError(response, 500, "A007", err);
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
                if (err) statusCodeAndError(response, 500, "A007", err);
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
                if (err) return statusCodeAndError(response, 500, "A006", err);
                if (!blogId) return statusCodeAndError(response, 400, "A007", new Error("Blog not found"));
                // So that article can be inserted into the correct blog via blogs.id
                let queryToUpdateArticle = `
                    UPDATE articles
                    SET
                        category = ?, title = ?, subtitle = ?,
                        body = ?, body_plain = ?, blog_id = ?
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
                    if (err) statusCodeAndError(response, 500, "A006", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

// Export a module containing the following so external files (index.js) can access it
module.exports = router;
