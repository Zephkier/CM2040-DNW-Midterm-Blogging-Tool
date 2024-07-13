/**
 * For any response.redirect() due to invalid URL/access,
 * show error popup box with reasoning for better UX.
 *
 * How it works:
 * 1. In middleware.js, based on context and condition, redirect with additional "?error=<error_indicator>".
 * 2. In redirect endpoint (.ejs), add <div id="popup"> and its contents.
 * 3. In here, add condition to check for error_indicator set earlier, and add message to display to user.
 * 4. ???
 * 5. Profit.
 *
 * For reference:
 * <div id="popup" class="popup hidden">
 * <p id="popup-message">
 * <button id="popup-close">
 */

// Upon page load, run callback function
document.addEventListener("DOMContentLoaded", () => {
    // In URL, search for any "?error="
    let urlParams = new URLSearchParams(window.location.search);
    let error = urlParams.get("error");
    if (error) {
        let message = null;

        // Redirect to login.ejs
        if (error == "not_logged_in") message = "You must login first!";

        // Redirect to author/home.ejs
        if (error == "article_not_draft") message = "The article is either published or deleted!";
        if (error == "article_inaccessible") message = "The article is inaccessible for security reasons!"; // Article doesn't belong to blog
        if (error == "already_have_a_blog") message = "You already have a blog!";

        // Redirect to create-blog.ejs
        if (error == "no_blog") message = "You must create a blog first!";

        // Redirect to reader/home.ejs
        if (error == "invalid_blog_article_id") message = "Invalid blog and article ID!";

        if (message) {
            // Set <p>'s text to message
            document.getElementById("popup-message").textContent = message;
            // Display entire <div> by removing "hidden" class that was used to hide it
            document.getElementById("popup").classList.remove("hidden");
        }
    }

    // If <button> clicked, then hide entire <div> by adding "hidden" class
    document.getElementById("popup-close").addEventListener("click", () => {
        document.getElementById("popup").classList.add("hidden");
    });
});
