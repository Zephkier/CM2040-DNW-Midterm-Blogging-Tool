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
    if (!request.session.user) return response.redirect("/login");
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
        SELECT blogs.id, blogs.title, blogs.user_id, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return errorPage(response, 500, "A001", err);
        if (!blogInfo) return response.redirect("/author/create-blog");
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
        if (err) return errorPage(response, 500, "A001", err);
        if (blogInfo) return response.redirect("/author");
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
 * - **all properties** within `articles` table
 *
 * @returns Redirect to home (author) or call next().
 */
function ensure_ArticleBelongsToBlog(request, response, next) {
    let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
    let chosenId = request.params.chosenId; // Get param from URL
    db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
        console.log(chosenArticle);
        if (err) return errorPage(response, 500, "A014", err);
        if (
            // Format
            chosenArticle.blog_id != request.blogInfo.id ||
            !chosenArticle
        )
            return response.redirect("/author");
        request.chosenArticle = chosenArticle;
        next();
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
};
