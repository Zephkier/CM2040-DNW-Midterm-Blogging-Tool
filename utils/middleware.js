// Import and setup modules
const striptags = require("striptags");

/**
 * If invalid database query, then do this.
 * @param {response} response Express' response object for access webpage.
 * @param {number} statusCode Status code to send out.
 * @param {string} crashId Custom crash ID to find error's exact location. (eg. `"A001"` for author or `"R001"` for readery).
 * @param {error} err Error to be console logged.
 * @returns Short message, crash ID and actual error that happened.
 */
function statusCodeAndError(response, statusCode, crashId, err) {
    response.status(statusCode).send(`Something went wrong!<br><br>Report the error below to the support staff:<br><br>Crash ID: ${crashId}<br>${err}`);
}

/**
 * Returns converted datetime/timezone from UTC to local.
 * @param {datetime} datetimeFromDb UTC datetime that is given by SQLite3.
 * @returns Local datetime as a string. (eg. DD/MM/YYYY, H:MM:SS am)
 */
function returnUTCtoLocalDatetime(datetimeFromDb) {
    // Add "Z" behind datetime to indicate it is UTC timezone
    return new Date(datetimeFromDb + "Z").toLocaleString();
}

/**
 * Returns shortened (300 char, but can be changed here) and HTML-tag-less string.
 *
 * Mainly for home (reader) page. Edits can be done here to allow some tags!
 *
 * Taken inspo from Blogger:
 * - At home (reader): display without HTML tags and formatting whatsoever.
 * - Expand into specific article: display with HTML tags and formatting present.
 *
 * @param {string} stringWithTags String (mainly article's body) that contains HTML tags.
 * @param {number} charLength Character length to limit; affects home (reader) page.
 * @returns The same string without any HTML tags.
 */
function returnShortenAndStripped(stringWithTags) {
    let stripped = striptags(stringWithTags);
    if (stripped.length > 300) return stripped.substring(0, 300) + "...";
    return stripped;
}

// Export module containing the following so external files can access it
module.exports = {
    statusCodeAndError,
    returnUTCtoLocalDatetime,
    returnShortenAndStripped,
};
