// Import and setup modules
const express = require("express");
// const { check, validationResult } = require("express-validator");
const { db } = require("../utils/db.js");
const {
    // Format
    errorPage,
    return_ConversionFromUTC_ToLocalDatetime,
    return_StrippedAnd_ShortenedString,
    if_UserLoggedIn,
    // if_UserHasABlog,
    // if_UserHasNoBlog,
    // if_ArticleBelongsToBlog,
} = require("../utils/middleware.js");

const router = express.Router();

// Home (reader), view all blogs and their authors
router.get("/", (request, response) => {
    let queryForAllBlogsAndUsers = `
        SELECT
            blogs.id, blogs.title, users.display_name,
            COUNT(articles.id) as article_count
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        LEFT JOIN articles
        ON blogs.id = articles.blog_id AND articles.category = 'published'
        GROUP BY blogs.id, blogs.title, users.display_name`;
    db.all(queryForAllBlogsAndUsers, (err, allBlogsAndUsers) => {
        if (err) return errorPage(response, 500, "R001", err);
        return response.render("reader/home.ejs", {
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
    let queryForChosenBlogAndUser = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE blogs.id = ?`;
    db.get(queryForChosenBlogAndUser, [chosenBlogId], (err, blogAndUser) => {
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

// Choose published article to read, no blog and article chosen by default, so redirect to blog selection
router.get("/blog/:chosenBlogId/article", (request, response) => {
    response.redirect("/reader/blog/:chosenBlogId");
});

// Choose published article to read, view all of its contents
router.get("/blog/:chosenBlogId/article/:chosenArticleId", (request, response) => {
    let chosenBlogId = request.params.chosenBlogId;
    let chosenArticleId = request.params.chosenArticleId;
    let userId = request.session.user ? request.session.user.id : null;

    let queryForChosenBlogAndUser = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE blogs.id = ?`;
    db.get(queryForChosenBlogAndUser, [chosenBlogId], (err, blogAndUser) => {
        if (err) return errorPage(response, 500, "R001", err);
        // If no blogAndUser (possibly due to URL manip), then redirect back to blog selection
        if (!blogAndUser) return response.redirect("/reader/blog/:chosenBlogId");

        // Must query to update articles.view first, then query for all published articles
        // This is to prevent a bug where articles.view only updates when in blog.ejs (the page that lists all of blog's published articles)
        let queryToIncrementViewCount = "UPDATE articles SET views = views + 1 WHERE id = ?";
        db.run(queryToIncrementViewCount, [chosenArticleId], (err) => {
            if (err) return errorPage(response, 500, "R002", err);

            let queryForChosenPublishedArticle = `
                SELECT * FROM articles
                WHERE blog_id = ? AND articles.id = ?`;
            db.get(queryForChosenPublishedArticle, [chosenBlogId, chosenArticleId], (err, publishedArticle) => {
                if (err) return errorPage(response, 500, "R001", err);
                // Convert datetimes
                publishedArticle.date_created = return_ConversionFromUTC_ToLocalDatetime(publishedArticle.date_created);
                publishedArticle.date_modified = return_ConversionFromUTC_ToLocalDatetime(publishedArticle.date_modified);

                let queryForComments = `
                    SELECT comments.id, comments.body, comments.date_created, users.display_name
                    FROM comments
                    JOIN users ON comments.user_id = users.id
                    WHERE comments.article_id = ?
                    ORDER BY comments.date_created DESC`;
                db.all(queryForComments, [chosenArticleId], (err, comments) => {
                    if (err) return errorPage(response, 500, "R001", err);

                    // Convert datetimes
                    comments.forEach((comment) => {
                        comment.date_created = return_ConversionFromUTC_ToLocalDatetime(comment.date_created);
                    });

                    // Check if the user has liked the article
                    let queryToCheckIfAlreadyLiked = `
                        SELECT * FROM likes WHERE user_id = ? AND article_id = ?`;
                    db.get(queryToCheckIfAlreadyLiked, [userId, chosenArticleId], (err, like) => {
                        if (err) return errorPage(response, 500, "R003", err);

                        response.render("reader/article.ejs", {
                            pageName: "Read blog's article",
                            user: request.session.user,
                            blogAndUser: blogAndUser,
                            publishedArticle: publishedArticle,
                            comments: comments,
                            hasLiked: !!like, // Check if the user has liked the article
                        });
                    });
                });
            });
        });
    });
});

// Entering comment
router.post("/blog/:chosenBlogId/article/:chosenArticleId", if_UserLoggedIn, (request, response) => {
    let chosenBlogId = request.params.chosenBlogId;
    let chosenArticleId = request.params.chosenArticleId;

    let queryToInsertComment = `
    INSERT INTO comments (user_id, article_id, body)
    VALUES (?, ?, ?)`;
    let params = [request.session.user.id, chosenArticleId, request.body.enterComment];
    db.run(queryToInsertComment, params, (err) => {
        if (err) return errorPage(response, 500, "R002", err);
        response.redirect(`/reader/blog/${chosenBlogId}/article/${chosenArticleId}#comments-section`);
    });
});

// Show users who liked an article
router.get("/blog/:chosenBlogId/article/:chosenArticleId/likes", (request, response) => {
    let queryForChosenBlogAndUser = `
    SELECT blogs.id, blogs.title, users.display_name
    FROM blogs JOIN users
    ON blogs.user_id = users.id
    WHERE blogs.id = ?`;
    db.get(queryForChosenBlogAndUser, [request.params.chosenBlogId], (err, blogAndUser) => {
        if (err) return errorPage(response, 500, "R001", err);
        // If no blogAndUser (possibly due to URL manip), then redirect back to blog selection
        if (!blogAndUser) return response.redirect("/reader/blog/:chosenBlogId");

        let queryForLikes = `
        SELECT *, users.display_name
        FROM likes JOIN users
        ON likes.user_id = users.id
        WHERE likes.article_id = ?
        ORDER BY likes.date_created DESC`;
        db.all(queryForLikes, [request.params.chosenArticleId], (err, likes) => {
            if (err) return errorPage(response, 500, "R006", err);

            // Convert datetimes
            likes.forEach((like) => {
                like.date_created = return_ConversionFromUTC_ToLocalDatetime(like.date_created);
            });

            console.log(likes);
            response.render("reader/likes.ejs", {
                pageName: "Article Likes",
                user: request.session.user,
                blogAndUser: blogAndUser,
                likes: likes,
            });
        });
    });
});

router.post("/blog/:chosenBlogId/article/:chosenArticleId/like", if_UserLoggedIn, (request, response) => {
    let chosenBlogId = request.params.chosenBlogId;
    let chosenArticleId = request.params.chosenArticleId;
    let userId = request.session.user.id;

    let queryToCheckIfAlreadyLiked = `
        SELECT * FROM likes WHERE user_id = ? AND article_id = ?`;
    db.get(queryToCheckIfAlreadyLiked, [userId, chosenArticleId], (err, like) => {
        if (err) return errorPage(response, 500, "R003", err);
        if (like) return response.redirect(`/reader/blog/${chosenBlogId}/article/${chosenArticleId}`);

        let queryToInsertLike = `
            INSERT INTO likes (user_id, article_id)
            VALUES (?, ?)`;
        db.run(queryToInsertLike, [userId, chosenArticleId], (err) => {
            if (err) return errorPage(response, 500, "R004", err);

            let queryToUpdateArticleLikes = `
                UPDATE articles SET likes = likes + 1 WHERE id = ?`;
            db.run(queryToUpdateArticleLikes, [chosenArticleId], (err) => {
                if (err) return errorPage(response, 500, "R005", err);
                response.redirect(`/reader/blog/${chosenBlogId}/article/${chosenArticleId}`);
            });
        });
    });
});

router.post("/blog/:chosenBlogId/article/:chosenArticleId/unlike", if_UserLoggedIn, (request, response) => {
    let chosenBlogId = request.params.chosenBlogId;
    let chosenArticleId = request.params.chosenArticleId;
    let userId = request.session.user.id;

    let queryToDeleteLike = `
        DELETE FROM likes WHERE user_id = ? AND article_id = ?`;
    db.run(queryToDeleteLike, [userId, chosenArticleId], (err) => {
        if (err) return errorPage(response, 500, "R007", err);

        let queryToUpdateArticleLikes = `
            UPDATE articles SET likes = likes - 1 WHERE id = ?`;
        db.run(queryToUpdateArticleLikes, [chosenArticleId], (err) => {
            if (err) return errorPage(response, 500, "R008", err);
            response.redirect(`/reader/blog/${chosenBlogId}/article/${chosenArticleId}`);
        });
    });
});

// Export module containing the following so external files can access it
module.exports = router;
