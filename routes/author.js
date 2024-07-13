// Import and setup modules
const express = require("express");
const { check, validationResult } = require("express-validator");
const { db } = require("../utils/db.js");
const {
    // Format
    errorPage,
    returnLocalDatetime,
    returnShortenPlainText,
    ensure_UserLoggedIn,
    ensure_UserHasABlog,
    ensure_UserHasNoBlog,
    ensure_ArticleBelongsToBlog,
    ensure_ArticleIsNot_PublishedOrDeleted,
} = require("../utils/middleware.js");

const router = express.Router();

// Ensure user is logged in and has a blog to access some of these pages!

/**
 * Home (author) page
 *
 * This is where user can view and manage all their articles.
 * Buttons and implementation are below this function.
 *
 * User can:
 * - Edit blog title and author name via settings.
 * - Create new article and either draft or publish it directly.
 */
router.get("/", ensure_UserLoggedIn, ensure_UserHasABlog, (request, response) => {
    /**
     * Database interaction:
     * Query for articles from the author's blog, ordered by the last modified date.
     *
     * Output:
     * Array of `{}` with `keys` like `articles` table from database.
     */
    let queryForArticlesFromBlog = `
            SELECT * FROM articles
            WHERE blog_id = ?
            ORDER BY date_modified DESC`;
    db.all(queryForArticlesFromBlog, [request.blogInfo.id], (err, articlesFromBlog) => {
        if (err) return errorPage(response, 500, "A018", err);
        // Order is [draft], [published], [deleted]
        let allArticles = [[], [], []];
        articlesFromBlog.forEach((article) => {
            // Setup body_plain as it is empty initially
            article.body_plain = returnShortenPlainText(article.body);
            // Use <br> so it can be applied in frontend, must use <%- %>
            article.date_created = returnLocalDatetime(article.date_created).replace().replace(", ", "<br>");
            article.date_modified = returnLocalDatetime(article.date_modified).replace(", ", "<br>");
            // Filter into different categories
            if (article.category == "draft") allArticles[0].push(article);
            else if (article.category == "published") allArticles[1].push(article);
            else if (article.category == "deleted") allArticles[2].push(article);
        });
        return response.render("author/home.ejs", {
            pageName: "Home (author)",
            user: request.session.user,
            blog: request.blogInfo,
            articleCategories: ["Draft", "Published", "Deleted"],
            tableHeaders: ["Title", "Subtitle", "Views", "Likes", "Date created", "Date modified", "Actions"],
            allArticles: allArticles,
        });
    });
});

/**
 * Action buttons (not including "Edit" button which is at .get("/article")).
 *
 * - For draft articles,     user can edit,   publish or delete.
 * - For published articles, user can share   or delete.
 * - For deleted articles,   user can recover or delete permanently.
 *
 * In event the article to delete permanently has likes and comments connected to it via FKs,
 * Ensure to also delete all connections first.
 *
 * This prevents FK constraint errors.
 */
router.post("/", (request, response) => {
    let chosenId = request.body.chosenId;
    if (request.body.thisReturnsItsValue === "delete-permanently") {
        db.run("BEGIN TRANSACTION", (err) => {
            if (err) return errorPage(response, 500, "A001", err);
            db.run("DELETE FROM comments WHERE article_id = ?", [chosenId], (err) => {
                if (err) {
                    db.run("ROLLBACK", () => {});
                    return errorPage(response, 500, "A002", err);
                }
                db.run("DELETE FROM likes WHERE article_id = ?", [chosenId], (err) => {
                    if (err) {
                        db.run("ROLLBACK", () => {});
                        return errorPage(response, 500, "A003", err);
                    }
                    db.run("DELETE FROM articles WHERE id = ?", [chosenId], (err) => {
                        if (err) {
                            db.run("ROLLBACK", () => {});
                            return errorPage(response, 500, "A004", err);
                        }
                        db.run("COMMIT", (err) => {
                            if (err) {
                                db.run("ROLLBACK", () => {});
                                return errorPage(response, 500, "A005", err);
                            }
                            return response.redirect("/author");
                        });
                    });
                });
            });
        });
    } else {
        // Update article category (draft, published, deleted)
        let queryToUpdateOrDelete = `UPDATE articles SET category = ? WHERE id = ?`;
        db.run(queryToUpdateOrDelete, [request.body.thisReturnsItsValue, chosenId], (err) => {
            if (err) return errorPage(response, 500, "A006", err);
            return response.redirect("/author");
        });
    }
});

/**
 * Create blog page
 *
 * This is where (new) user can create a new blog. Only for users without one.
 */
router.get("/create-blog", ensure_UserLoggedIn, ensure_UserHasNoBlog, (request, response) => {
    return response.render("author/create-blog.ejs", {
        pageName: "Create a blog",
        user: request.session.user,
        formInputStored: {},
        formErrors: [],
    });
});

router.post("/create-blog", [check("createBlogTitle", "Title must have at least 1 character").trim().notEmpty()], (request, response) => {
    const formErrors = validationResult(request); // Returns {formatter = [<stuff inside>], errors = [<stuff inside>]}
    // If validation is bad, then re-render page with errors
    if (!formErrors.isEmpty()) {
        return response.render("author/create-blog.ejs", {
            pageName: "Create a blog",
            user: request.session.user,
            formInputStored: { createBlogTitle: request.body.createBlogTitle },
            formErrors: formErrors.errors, // Returns [{type, value, msg, path, location}]
        });
    } else {
        let queryToCreateBlogTitle = "INSERT INTO blogs (title, user_id) VALUES (?, ?)";
        let params = [request.body.createBlogTitle, request.session.user.id];
        db.run(queryToCreateBlogTitle, params, (err) => {
            if (err) return errorPage(response, 500, "A007", err);
            return response.redirect("/author");
        });
    }
});

/**
 * Settings page
 *
 * This is where user can update their blog title and display name.
 */
router.get("/settings", ensure_UserLoggedIn, ensure_UserHasABlog, (request, response) => {
    return response.render("author/settings.ejs", {
        pageName: "Settings",
        user: request.session.user,
        formInputStored: {
            blogTitle: request.blogInfo.title,
            displayName: request.blogInfo.display_name,
        },
        formErrors: [],
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
                if (err) return errorPage(response, 500, "A008", err);
                let queryToUpdateDisplayName = "UPDATE users SET display_name = ? WHERE id = ?";
                db.run(queryToUpdateDisplayName, [request.body.displayName, request.session.user.id], (err) => {
                    if (err) return errorPage(response, 500, "A009", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

/**
 * Article page (default = new article)
 *
 * When creating new article, in which user can choose to:
 * - Draft
 * - Publish
 * - Cancel and go back
 */
router.get("/article", ensure_UserLoggedIn, ensure_UserHasABlog, (request, response) => {
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
                if (err) return errorPage(response, 500, "A010", err);
                if (!blogId) return errorPage(response, 400, "A011", new Error("Blog not found"));
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
                    returnShortenPlainText(request.body.articleBody), // Get its plain version
                    blogId.id,
                ];
                db.run(queryToInsertArticle, params, (err) => {
                    if (err) return errorPage(response, 500, "A012", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

/**
 * Article page (edit articles)
 *
 * This is where user can edit draft articles.
 *
 * `:chosenId` is retrieved upon clicking "Edit" action button.
 */
router.get(
    "/article/:chosenId",
    // Format
    ensure_UserLoggedIn,
    ensure_UserHasABlog,
    ensure_ArticleBelongsToBlog,
    ensure_ArticleIsNot_PublishedOrDeleted,
    (request, response) => {
        let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
        let chosenId = request.params.chosenId; // Get param from URL
        db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
            if (err) return errorPage(response, 500, "A013", err);
            if (!chosenArticle) return response.redirect("/author");
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
    }
);

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
                if (err) return errorPage(response, 500, "A014", err);
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
                if (err) return errorPage(response, 500, "A015", err);
                if (!blogId) return errorPage(response, 400, "A016", new Error("Blog not found"));
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
                    returnShortenPlainText(request.body.articleBody), // Get its plain version
                    blogId.id,
                    request.params.chosenId,
                ];
                db.run(queryToUpdateArticle, params, (err) => {
                    if (err) return errorPage(response, 500, "A017", err);
                    return response.redirect("/author");
                });
            });
        }
    }
);

/**
 * After every possible page above, this handles invalid URLs after "/author" prefix
 */
router.get("/*", (request, response) => {
    return response.redirect("/author");
});

// Export module containing the following so external files can access it
module.exports = router;
