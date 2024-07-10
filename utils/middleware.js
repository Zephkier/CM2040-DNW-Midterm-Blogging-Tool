// Import and setup modules
const striptags = require("striptags");
const { db } = require("./db");

/**
 * If invalid database query, then do this.
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
 * Returns converted datetime.
 *
 * Adds "Z" behind incoming datetime to indicate it is UTC timezone
 *
 * @param {string} dbDatetime UTC datetime given by database.
 * @returns String of local datetime in "DD/MM/YYYY, H:MM:SS am/pm" format.
 */
function return_ConversionFromUTC_ToLocalDatetime(dbDatetime) {
    return new Date(dbDatetime + "Z").toLocaleString();
}

/**
 * Returns a HTML-tagless and shortened string; mainly for home (reader) page.
 *
 * Edits can be done here:
 * - Current character limit = 300.
 * - Current allowed HTML tags = none.
 *
 * This is inspired from Blogger as they do not display formatting at home (reader) page.
 *
 * But displays it when expanded into an article.
 *
 * @param {string} stringWithTags String containing HTML tags.
 * @returns String without any HTML tags and shorted to custom-set character limit.
 */
function return_StrippedAnd_ShortenedString(stringWithTags) {
    let stripped = striptags(stringWithTags);
    if (stripped.length > 300) return stripped.substring(0, 300) + "...";
    return stripped;
}

/**
 * Ensures non-user (aka. users not logged in) cannot access a page.
 *
 * If user is not logged in, then redirect to home (main).
 *
 * @param {object} request Express request object.
 * @param {object} response Express response object.
 * @param {function} next Express next() function.
 * @returns Redirect non-user to home (main) or call next().
 */
function if_UserLoggedIn(request, response, next) {
    if (!request.session.user) return response.redirect("/");
    next();
}

/**
 * Ensures user WITHOUT a blog cannot access a page.
 *
 * It queries database for user's blog information like blogs.id, blogs.title.
 *
 * - If user does not have a blog,
 * - And tries to access blog settings or articles (for whatever else),
 * - Then redirect to create a blog.
 *
 * @param {object} request Express request object.
 * @param {object} response Express response object.
 * @param {function} next Express next() function.
 * @returns Redirect user to create a blog or call next().
 */
function if_UserHasABlog(request, response, next) {
    // TEST if i can just use "SELECT *" instead of specifying whatever bs
    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
        FROM blogs JOIN users
        ON blogs.user_id = users.id
        WHERE users.id = ?`;
    db.get(queryForBlogInfo, [request.session.user.id], (err, blogInfo) => {
        if (err) return errorPage(response, 500, "A001", err);
        if (!blogInfo) return response.redirect("/author/create-blog");
        request.blogInfo = blogInfo; // blogInfo is now accessible in request object
        next();
    });
}

/**
 * Ensures user WITH a blog cannot access a page; mainly for if they try to access "create-blog"
 *
 * Does the same thing as if_UserHasABlog(), but with opposite checks.
 *
 * @param {object} request Express request object.
 * @param {object} response Express response object.
 * @param {function} next Express next() function.
 * @returns Redirect user to home (author) or call next().
 */
function if_UserHasNoBlog(request, response, next) {
    // TEST if i can just use "SELECT *" instead of specifying whatever bs
    let queryForBlogInfo = `
        SELECT blogs.id, blogs.title, users.display_name
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
 * Ensures user cannot access articles that do not belong to their blog.
 *
 * It queries database for article's information.
 *
 * - If articles.blog_id != blogs.id, then access not allowed.
 * - If ==, then access allowed.
 *
 * @param {object} request Express request object.
 * @param {object} response Express response object.
 * @param {function} next Express next() function to proceed with rest of code file.
 * @returns {void} 403 status code or call next().
 */
function if_ArticleBelongsToBlog(request, response, next) {
    let queryForChosenArticle = "SELECT * FROM articles WHERE id = ?";
    let chosenId = request.params.chosenId; // Get param from URL
    db.get(queryForChosenArticle, [chosenId], (err, chosenArticle) => {
        if (err) return errorPage(response, 500, "A014", err);
        if (chosenArticle.blog_id != request.blogInfo.id || !chosenArticle) return response.redirect("/author");
        request.chosenArticle = chosenArticle;
        next();
    });
}

// Export module containing the following so external files can access it
module.exports = {
    errorPage,
    return_ConversionFromUTC_ToLocalDatetime,
    return_StrippedAnd_ShortenedString,
    if_UserLoggedIn,
    if_UserHasABlog,
    if_UserHasNoBlog,
    if_ArticleBelongsToBlog,
};
