// Import and setup modules
const express = require("express");
// const { check, validationResult } = require("express-validator");
const { db } = require("../utils/db.js");
const {
    // Format
    errorPage,
    return_ConversionFromUTC_ToLocalDatetime,
    return_StrippedAnd_ShortenedString,
    // if_UserLoggedIn,
    // if_UserHasABlog,
    // if_UserHasNoBlog,
    // if_ArticleBelongsToBlog,
} = require("../utils/middleware.js");

const router = express.Router();

// Home (reader), view all blogs and their authors
router.get("/", (request, response) => {
    let queryForAllBlogsAndUsers = `
        SELECT
            blogs.id, blogs.title,
            users.display_name,
            COUNT(articles.id) as article_count
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        LEFT JOIN articles
        ON blogs.id = articles.blog_id AND articles.category = 'published'
        GROUP BY blogs.id, blogs.title, users.display_name`;
    db.all(queryForAllBlogsAndUsers, (err, allBlogsAndUsers) => {
        if (err) return errorPage(response, 500, "R001", err);
        response.render("reader/home.ejs", {
            pageName: "Home (reader)",
            user: request.session.user,
            allBlogsAndUsers: allBlogsAndUsers,
            tableHeaders: ["Blog title", "Author", "Actions"],
        });
    });
});

// Choose blog to read, no blog chosen by default, so redirect to blog selection
router.get("/blog", (request, response) => {
    response.redirect("/reader");
});

// Choose blog to read, view all of its published articles
router.get("/blog/:chosenBlogId", (request, response) => {
    let chosenBlogId = request.params.chosenBlogId;
    let queryForBlogAndUser = `
        SELECT *
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE blogs.id = ?`;
    db.get(queryForBlogAndUser, [chosenBlogId], (err, blogAndUser) => {
        if (err) return errorPage(response, 500, "R001", err);
        // If no blogAndUser (possibly due to URL manip), then redirect back to blog selection
        if (!blogAndUser) return response.redirect("/reader");
        let queryForPublishedArticles = `
            SELECT * FROM articles
            WHERE blog_id = ? AND category = 'published'`;
        db.all(queryForPublishedArticles, [chosenBlogId], (err, publishedArticles) => {
            if (err) return errorPage(response, 500, "R001", err);
            publishedArticles.forEach((article) => {
                // Setup body_plain as it is empty initially
                article.body_plain = return_StrippedAnd_ShortenedString(article.body);
                // Convert datetimes
                article.date_created = return_ConversionFromUTC_ToLocalDatetime(article.date_created);
                article.date_modified = return_ConversionFromUTC_ToLocalDatetime(article.date_modified);
            });
            response.render("reader/blog.ejs", {
                pageName: "Read blog",
                user: request.session.user,
                blogAndUser: blogAndUser,
                publishedArticles: publishedArticles,
            });
        });
    });
});

// // TEST
// console.log(publishedArticles);
// // TEST

// Choose published article to read, no blog and article chosen by default, so redirect to blog selection
router.get("/blog/:blogId/article", (request, response) => {
    response.redirect("/blog/:blogId/reader");
});

// Choose published article to read, view all of its contents
router.get("/blog/:blogId/article/:chosenId", (request, response) => {
    let chosenId = request.params.chosenId;

    let queryForBlogInfo = `
        SELECT *
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE blogs.id = ?`;
    db.get(queryForBlogInfo, [chosenId], (err, blogInfo) => {
        if (err) return errorPage(response, 500, "R001", err);
        if (!blogInfo) return response.redirect("/reader/blog/:blogId");

        let queryForPublishedArticles = `
            SELECT * FROM articles
            WHERE blog_id = ? AND category = 'published'`;
        db.all(queryForPublishedArticles, [chosenId], (err, publishedArticles) => {
            if (err) return errorPage(response, 500, "R001", err);
            publishedArticles.forEach((article) => {
                // Setup body_plain as it is empty initially
                article.body_plain = return_StrippedAnd_ShortenedString(article.body);
                // Convert datetimes
                article.date_created = return_ConversionFromUTC_ToLocalDatetime(article.date_created);
                article.date_modified = return_ConversionFromUTC_ToLocalDatetime(article.date_modified);
            });
            response.render("reader/blog.ejs", {
                pageName: "Read blog",
                user: request.session.user,
                publishedArticles: publishedArticles,
                blogInfo: blogInfo,
            });
        });
    });

    // let chosenId = request.params.chosenId;
    // let queryForBlogInfo = `SELECT * FROM blogs JOIN users ON blogs.user_id = users.id WHERE blogs.id = ?`;
    // db.get(queryForBlogInfo, [chosenId], (err, blogInfo) => {
    //     if (err) return errorPage(response, 500, "R001", err);
    //     let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
    //     db.all(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
    //         if (err) errorPage(response, 500, "R005", err);
    //         response.render("reader/article.ejs", {
    //             pageName: "Read article",
    //             user: request.session.user,
    //             blogInfo: blogInfo,
    //             chosenArticle: chosenArticle,
    //         });
    //     });
    // });
});

router.get("/blog/:blogId/article/:chosenId", (request, response) => {
    response.redirect("/reader");
});

// Export module containing the following so external files can access it
module.exports = router;
