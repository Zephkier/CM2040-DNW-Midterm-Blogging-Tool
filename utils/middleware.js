// Import and setup modules
const striptags = require("striptags");
const { db } = require("./db");

/**
 * If invalid database query, then display this.
 *
 * @param {object} response Express response object.
 * @param {number} statusCode Status code to send out.
 * @param {string} crashId Custom crash ID to find error's exact location.
 * @param {error} err Error to be console logged.
 */
function errorPage(response, statusCode, crashId, err) {
    response.status(statusCode).send(`Something went wrong!<br><br>Report the error below to the support staff:<br><br>Crash ID: ${crashId}<br>${err}`);
}

/**
 * Convert from UTC datetime to local datetime.
 *
 * @param {string} dbDatetime UTC datetime given by database.
 * @returns String of local datetime in "DD/MM/YYYY, H:MM:SS am/pm" format.
 */
function returnLocalDatetime(dbDatetime) {
    return new Date(dbDatetime + "Z").toLocaleString();
}

/**
 * Remove HTML tags, limit character length, add "..." behind.
 *
 * - Mainly for home (reader) page.
 * - Character limit can be changed here (current: 300 limit).
 * - Allowed HTML tags can be set here (current: none allowed).
 *
 * Inspired from Blogger as they also do not display text formatting at home (reader) page.
 *
 * They only display it when expanded into an article.
 *
 * @param {string} stringWithTags String containing HTML tags.
 * @returns String without HTML tags and limited character.
 */
function returnShortenPlainText(stringWithTags) {
    let stripped = striptags(stringWithTags);
    if (stripped.length > 300) return stripped.substring(0, 300) + "...";
    return stripped;
}

/**
 * - If user is logged in, then proceed.
 * - If user is not logged in, then they cannot enter page.
 *
 * @returns Redirect to login or call next().
 */
function ensure_UserLoggedIn(request, response, next) {
    if (!request.session.user) return response.redirect("/login?error=not_logged_in");
    next();
}

/**
 * - If user has a blog, then proceed.
 * - If user has no blog, then they cannot enter page.
 *
 * Creates `blogInfo`, accessed via `request.blogInfo`, which has:
 * - `.id`
 * - `.title`
 * - `.user_id`
 * - `.display_name`
 *
 * @returns Redirect to create a blog or call next().
 */
function ensure_UserHasABlog(request, response, next) {
    let queryForBlogInfo = `
        SELECT
            blogs.id,
            blogs.title,
            blogs.user_id,
            users.display_name
        FROM blogs
        JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return errorPage(response, 500, "M001", err);
        if (!blogInfo) return response.redirect("/author/create-blog?error=no_blog");
        request.blogInfo = blogInfo;
        next();
    });
}

/**
 * - If user has no blog, then proceed.
 * - If user has a blog, then they cannot enter page.
 *
 * This is flipped from the other function!
 * This is for users, who already have a blog, trying to access the "Create a blog" page.
 *
 * @returns Redirect to home (author) or call next().
 */
function ensure_UserHasNoBlog(request, response, next) {
    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, blogs.user_id, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return errorPage(response, 500, "M002", err);
        if (blogInfo) return response.redirect("/author?error=already_have_a_blog");
        next();
    });
}

/**
 * - If article belongs to a blog, then proceed.
 * - If article does not belong to a blog, then cannot access page.
 *
 * Requires `request.blogInfo`. Thus, must call `ensure_UserHasABlog()` first.
 *
 * Creates `chosenArticle`, accessed via `request.chosenArticle`, which has:
 * - **All properties** within `articles` table.
 *
 * @returns Redirect to home (author) or call next().
 */
function ensure_ArticleBelongsToBlog(request, response, next) {
    let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
    let chosenId = request.params.chosenId; // Get param from URL
    db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
        if (err) return errorPage(response, 500, "M003", err);
        if (!chosenArticle || chosenArticle.blog_id != request.blogInfo.id) return response.redirect("/author?error=article_inaccessible");
        request.chosenArticle = chosenArticle;
        next();
    });
}

/**
 * - If article is draft, then proceed.
 * - If article is published or deleted, then it cannot be accessed.
 *
 * @returns Redirect to home (author) or call next().
 */
function ensure_ArticleIsNot_PublishedOrDeleted(request, response, next) {
    let queryForChosenArticle = `
        SELECT * FROM articles
        WHERE id = ?
        AND (category = 'published' OR category = 'deleted')`;
    let chosenId = request.params.chosenId; // Get param from URL
    db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
        if (err) return errorPage(response, 500, "M013", err);
        if (chosenArticle) return response.redirect("/author?error=article_not_draft");
        next();
    });
}

/**
 * Get all blog (and user) info, ordered by the latest blog first.
 *
 * Database interaction:
 * - Query for certain columns from `blogs` and `users` table from database.
 * - Join `blogs.user_id` FK to `users.id` PK.
 *
 * Output:
 * - Array of `{id, title, user_id, display_name}`.
 * - Creates `blogInfo`, accessed via `request.blogInfo`, which has:
 *      - `.id`
 *      - `.title`
 *      - `.user_id`
 *      - `.display_name`
 */
function getAll_BlogInfo_LatestIdFirst(request, response, next) {
    let queryForBlogInfo = `
        SELECT
            blogs.id,
            blogs.title,
            blogs.user_id,
            users.display_name
        FROM blogs
        JOIN users
        ON blogs.user_id = users.id
        WHERE blogs.user_id = users.id
        ORDER BY blogs.id DESC`;
    db.all(queryForBlogInfo, (err, blogInfo) => {
        if (err) return errorPage(response, 500, "M004", err);
        if (!blogInfo) return errorPage(response, 500, "M005", err);
        request.blogInfo = blogInfo;
        next();
    });
}

/**
 * Get blog (and user) info based on `request.params.chosenBlogId`.
 *
 * Ensure `GET` router also uses the `:chosenBlogId` name.
 *
 * Has endpoint-handling feature if user tries to manipulate URL.
 *
 * Database interaction:
 * - Query for certain columns from `blogs` and `users` table from database.
 * - Join `blogs.user_id` FK to `users.id` PK.
 *
 * Output:
 * - Creates `blogInfo`, accessed via `request.blogInfo`, which has:
 *      - `.id`
 *      - `.title`
 *      - `.user_id`
 *      - `.display_name`
 */
function get_BlogInfo_BasedOnParam_ChosenBlogId(request, response, next) {
    let queryForBlogInfo = `
        SELECT
            blogs.id,
            blogs.title,
            blogs.user_id,
            users.display_name
        FROM blogs
        JOIN users
        ON blogs.user_id = users.id
        WHERE blogs.id = ?`;
    db.get(queryForBlogInfo, [request.params.chosenBlogId], (err, blogInfo) => {
        if (err) return errorPage(response, 500, "M006", err);
        if (!blogInfo) return response.redirect("/reader?error=invalid_blog_article_id");
        request.blogInfo = blogInfo;
        next();
    });
}

/**
 * As ANYONE is able to access this endpoint (referring to router that this is being used in),
 *
 * there is a need to account for both logged-in and non-logged-in users,
 *
 * as well as endpoint (URL) manipulation.
 *
 * Database interaction:
 * - Ensure only articles with `articles.blog_id == blogs.id` are accessible.
 * - Ensure only published articles are accessible.
 * - If blog belongs to you (`articles.blog_id == blogs.id` and `blogs.user_id == users.id`),
 *   then all categories of articles are accessible.
 *
 * Output:
 * - `{}` with `keys` exactly like 'articles' table from database.
 */
function get_PublishedArticles_BasedOnParams_ChosenBlogAndArticle(request, response, next) {
    let chosenBlogId = request.params.chosenBlogId;
    let chosenArticleId = request.params.chosenArticleId;
    let userId = request.session.user ? request.session.user.id : null;

    let queryForChosenPublishedArticle = null;
    let params = null;
    if (userId) {
        // Must specify `articles.*` or else `articles.title` is overwritten by `blogs.title`
        queryForChosenPublishedArticle = `
            SELECT articles.* FROM articles JOIN blogs
            ON articles.blog_id = blogs.id
            WHERE
                articles.blog_id = ?
            AND
                articles.id = ?
            AND
                (articles.category = 'published' OR blogs.user_id = ?)`;
        params = [chosenBlogId, chosenArticleId, userId];
    } else {
        // Must specify `articles.*` or else `articles.title` is overwritten by `blogs.title`
        queryForChosenPublishedArticle = `
            SELECT articles.* FROM articles JOIN blogs
            ON articles.blog_id = blogs.id
            WHERE
                articles.blog_id = ?
            AND
                articles.id = ?
            AND
                articles.category = 'published'`;
        params = [chosenBlogId, chosenArticleId];
    }
    db.get(queryForChosenPublishedArticle, params, (err, publishedArticle) => {
        if (err) return errorPage(response, 500, "M007", err);
        if (!publishedArticle) return response.redirect("/reader/blog/:chosenBlogId");
        // Convert datetimes
        publishedArticle.date_created = returnLocalDatetime(publishedArticle.date_created);
        publishedArticle.date_modified = returnLocalDatetime(publishedArticle.date_modified);
        request.publishedArticle = publishedArticle;
        next();
    });
}

/**
 * If used within a `GET` router, then ensure to call this function first to properly update view count.
 *
 * Database interaction:
 * - Increase selected published article's view count by one when ANYONE accesses its full page (this page).
 */
function update_ViewCount(request, response, next) {
    let queryToAddViewCount = "UPDATE articles SET views = views + 1 WHERE id = ?";
    db.run(queryToAddViewCount, [request.params.chosenArticleId], (err) => {
        if (err) return errorPage(response, 500, "M008", err);
        next();
    });
}

/**
 * This adds 1 like. Inserting/Deleting `likes` must be accompanied by updating.
 *
 * Database interaction:
 * - Insert into `likes` table from database.
 * - Update `articles` table's `like` column.
 *
 * Output:
 * - Redirects to same page with the updated like count.
 */
function insertUpdate_LikeCount(request, response, next) {
    let chosenArticleId = request.params.chosenArticleId;
    let queryToInsertLike = "INSERT INTO likes (user_id, article_id) VALUES (?, ?)";
    db.run(queryToInsertLike, [request.session.user.id, chosenArticleId], (err) => {
        if (err) return errorPage(response, 500, "M009", err);
        let queryToUpdateArticleLikes = "UPDATE articles SET likes = likes + 1 WHERE id = ?";
        db.run(queryToUpdateArticleLikes, [chosenArticleId], (err) => {
            if (err) return errorPage(response, 500, "M010", err);
            next();
        });
    });
}

/**
 * This removes 1 like. Inserting/Deleting `likes` must be accompanied by updating.
 *
 * Database interaction:
 * - Delete from `likes` table from database.
 * - Update `articles` table's `like` column.
 *
 * Output:
 * - Redirects to same page with the updated like count.
 *
 */
function deleteUpdate_LikeCount(request, response, next) {
    let chosenArticleId = request.params.chosenArticleId;
    let queryToDeleteLike = "DELETE FROM likes WHERE user_id = ? AND article_id = ?";
    db.run(queryToDeleteLike, [request.session.user.id, chosenArticleId], (err) => {
        if (err) return errorPage(response, 500, "M011", err);
        let queryToUpdateArticleLikes = "UPDATE articles SET likes = likes - 1 WHERE id = ?";
        db.run(queryToUpdateArticleLikes, [chosenArticleId], (err) => {
            if (err) return errorPage(response, 500, "M012", err);
            next();
        });
    });
}

// Export module containing the following so external files can access it
module.exports = {
    errorPage,
    returnLocalDatetime,
    returnShortenPlainText,
    ensure_UserLoggedIn,
    ensure_UserHasABlog,
    ensure_UserHasNoBlog,
    ensure_ArticleBelongsToBlog,
    ensure_ArticleIsNot_PublishedOrDeleted,
    getAll_BlogInfo_LatestIdFirst,
    get_BlogInfo_BasedOnParam_ChosenBlogId,
    get_PublishedArticles_BasedOnParams_ChosenBlogAndArticle,
    update_ViewCount,
    insertUpdate_LikeCount,
    deleteUpdate_LikeCount,
};
