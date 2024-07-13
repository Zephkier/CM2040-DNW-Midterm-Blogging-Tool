// Import and setup modules
const express = require("express");
const { db } = require("../utils/db.js");
const {
    // Format
    errorPage,
    returnLocalDatetime,
    returnShortenPlainText,
    ensure_UserLoggedIn,
    getAll_BlogInfo_LatestIdFirst,
    get_BlogInfo_BasedOnParam_ChosenBlogId,
    get_PublishedArticles_BasedOnParams_ChosenBlogAndArticle,
    update_ViewCount,
    insertUpdate_LikeCount,
    deleteUpdate_LikeCount,
} = require("../utils/middleware.js");

const router = express.Router();

/**
 * Home (reader) page (aka. select blog page)
 *
 * This is where user can view all blogs, its author and number of published articles.
 * User can select which blog they would like to read.
 */
router.get("/", getAll_BlogInfo_LatestIdFirst, (request, response) => {
    /**
     * Allow user to view the number of published articles for each blog.
     * Ensure query's `ORDER BY` is consistent. In this case, follow `getAll_BlogInfo_LatestIdFirst` order.
     *
     * Database interaction:
     * Query for the number of published articles for each blog, thus, `GROUP BY blogs.id`.
     * Join `articles.blog_id` FK to `blogs.id` PK.
     *
     * Output:
     * Array of {blog_id, article_count}.
     */
    let queryForPublishedCountInBlog = `
        SELECT
            blogs.id as blog_id,
            COUNT(articles.id) as article_count
        FROM blogs
        LEFT JOIN articles
        ON blogs.id = articles.blog_id AND articles.category = 'published'
        GROUP BY blogs.id
        ORDER BY blogs.id DESC`;
    db.all(queryForPublishedCountInBlog, (err, publishedCountInBlog) => {
        if (err) return errorPage(response, 500, "R001", err);
        return response.render("reader/home.ejs", {
            pageName: "Home (reader)",
            user: request.session.user,
            blogs: request.blogInfo,
            publishedCountInBlog: publishedCountInBlog,
        });
    });
});

/**
 * Select article page (default)
 *
 * This is where user can view all of the selected blog's published articles.
 * User can select which article they would like to read.
 *
 * It displays its metadata (eg. date published),
 * and a preview to its contents via `articles.body_plain` that has text without formatting.
 *
 * Note that this endpoint must have a number at the end.
 * If there is no number, then redirect to home (reader) for blog selection.
 */
router.get("/blog", (request, response) => {
    response.redirect("/reader");
});

/**
 * Select article page (actual)
 */
router.get("/blog/:chosenBlogId", get_BlogInfo_BasedOnParam_ChosenBlogId, (request, response) => {
    /**
     * Database interaction:
     * Query for articles...
     * - That belong to the selected `articles.blog_id`
     * - That are published
     * ...from `articles` table from database.
     *
     * Output:
     * Array of `{}` with `keys` like `articles` table from database.
     */
    let queryForPublishedArticles = `
        SELECT * FROM articles
        WHERE blog_id = ? AND category = 'published'
        ORDER BY articles.date_modified DESC`;
    db.all(queryForPublishedArticles, [request.params.chosenBlogId], (err, publishedArticles) => {
        if (err) return errorPage(response, 500, "R002", err);
        publishedArticles.forEach((article) => {
            // Setup body_plain as it is empty initially
            article.body_plain = returnShortenPlainText(article.body);
            // Convert datetimes
            article.date_created = returnLocalDatetime(article.date_created);
            article.date_modified = returnLocalDatetime(article.date_modified);
        });
        response.render("reader/blog.ejs", {
            pageName: "Select article",
            user: request.session.user,
            blog: request.blogInfo,
            publishedArticles: publishedArticles,
        });
    });
});

/**
 * Read article page (default)
 *
 * This is where user can view the selected published article in its entirety,
 * with text formatting included.
 *
 * If user is logged in, then they can also like, unlike and comment.
 * If user is not logged in, then they will be redirect to login.
 *
 * Note that this endpoint must have a number at the end.
 * If there is no number, then redirect to article selection.
 */
router.get("/blog/:chosenBlogId/article", (request, response) => {
    response.redirect(`/reader/blog/${request.params.chosenBlogId}`);
});

/**
 * Read article page (actual)
 */
router.get(
    "/blog/:chosenBlogId/article/:chosenArticleId",
    update_ViewCount, // Ensure to call this first
    get_BlogInfo_BasedOnParam_ChosenBlogId,
    get_PublishedArticles_BasedOnParams_ChosenBlogAndArticle,
    (request, response) => {
        let chosenBlogId = request.params.chosenBlogId;
        let chosenArticleId = request.params.chosenArticleId;
        let userId = request.session.user ? request.session.user.id : null;
        /**
         * Allow user to view comments on selected article, ordered by the latest comment first.
         *
         * Database interaction:
         * Query for comments from database.
         * Join `comments.user_id` FK to `users.id` PK.
         *
         * Output:
         * Array of `{id, body, date_created, display_name}`.
         */
        let queryForComments = `
            SELECT
                comments.id,
                comments.body,
                comments.date_created,
                users.display_name
            FROM comments
            JOIN users
            ON comments.user_id = users.id
            WHERE comments.article_id = ?
            ORDER BY comments.date_created DESC`;
        db.all(queryForComments, [chosenArticleId], (err, comments) => {
            if (err) return errorPage(response, 500, "R003", err);
            // Convert datetimes
            comments.forEach((comment) => {
                comment.date_created = returnLocalDatetime(comment.date_created);
            });
            /**
             * Check if the user has liked the article.
             *
             * Database interaction:
             * Query for comments from database.
             * Join `comments.user_id` FK to `users.id` PK.
             *
             * Output:
             * Array of `{id, body, date_created, display_name}`.
             */
            let queryToCheckIfAlreadyLiked = "SELECT * FROM likes WHERE user_id = ? AND article_id = ?";
            db.get(queryToCheckIfAlreadyLiked, [userId, chosenArticleId], (err, like) => {
                if (err) return errorPage(response, 500, "R004", err);
                response.render("reader/article.ejs", {
                    pageName: "Read article",
                    user: request.session.user,
                    blog: request.blogInfo,
                    publishedArticle: request.publishedArticle,
                    comments: comments,
                    hasLiked: !!like, // Converts truthy to true, falsy to false
                });
            });
        });
    }
);

/**
 * Entering comment, only logged in user can comment.
 *
 * Database interaction:
 * Insert new comment into `comments` table from database.
 *
 * Output:
 * Redirects to same page with the latest comment displayed first.
 */
router.post("/blog/:chosenBlogId/article/:chosenArticleId", ensure_UserLoggedIn, (request, response) => {
    let chosenBlogId = request.params.chosenBlogId;
    let chosenArticleId = request.params.chosenArticleId;

    let queryToInsertComment = `
    INSERT INTO comments (user_id, article_id, body)
    VALUES (?, ?, ?)`;
    let params = [request.session.user.id, chosenArticleId, request.body.enterComment];
    db.run(queryToInsertComment, params, (err) => {
        if (err) return errorPage(response, 500, "R005", err);
        response.redirect(`/reader/blog/${chosenBlogId}/article/${chosenArticleId}#comments-section`);
    });
});

/**
 * Article's 'like' page
 *
 * This is where user can see who liked a specific article with the latest displayed first.
 *
 * Database interaction:
 * Query for users who liked the selected article by joining `likes.user_id` FK to `users.id` PK.
 *
 * Output:
 * Array of {id, display_name, date_created}.
 */
router.get("/blog/:chosenBlogId/article/:chosenArticleId/likes", get_BlogInfo_BasedOnParam_ChosenBlogId, (request, response) => {
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
            like.date_created = returnLocalDatetime(like.date_created);
        });
        response.render("reader/likes.ejs", {
            pageName: "Article's 'likes'",
            user: request.session.user,
            blog: request.blogInfo,
            likes: likes,
            articleId: request.params.chosenArticleId,
        });
    });
});

/**
 * Liking article, only logged in user can like.
 */
router.post("/blog/:chosenBlogId/article/:chosenArticleId/like", ensure_UserLoggedIn, insertUpdate_LikeCount, (request, response) => {
    let chosenBlogId = request.params.chosenBlogId;
    let chosenArticleId = request.params.chosenArticleId;
    let queryToCheckIfAlreadyLiked = "SELECT * FROM likes WHERE user_id = ? AND article_id = ?";
    db.get(queryToCheckIfAlreadyLiked, [request.session.user.id, chosenArticleId], (err, like) => {
        if (err) return errorPage(response, 500, "R007", err);
        if (like) return response.redirect(`/reader/blog/${chosenBlogId}/article/${chosenArticleId}`);
        response.redirect(`/reader/blog/${chosenBlogId}/article/${chosenArticleId}`);
    });
});

/**
 * Unliking article, only logged in user can like.
 */
router.post("/blog/:chosenBlogId/article/:chosenArticleId/unlike", ensure_UserLoggedIn, deleteUpdate_LikeCount, (request, response) => {
    response.redirect(`/reader/blog/${request.params.chosenBlogId}/article/${request.params.chosenArticleId}`);
});

/**
 * After every possible page above, this handles invalid URLs after "/reader/blog/:id/article/:id" prefix
 */
router.get("/blog/:id/article/:id/*", (request, response) => {
    return response.redirect("/reader");
});

/**
 * After every possible page above, this handles invalid URLs after "/reader" prefix
 */
router.get("/*", (request, response) => {
    return response.redirect("/reader");
});

// Export module containing the following so external files can access it
module.exports = router;
