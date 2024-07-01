/**
 * Routes for management (in this case, it is users)
 *
 * Shows:
 * structure for routes for the app
 * pattern for retrieving data by executing queries
 *
 * Note: recommended NOT to use arrow functions for callbacks with SQLite library
 */

const express = require("express");
const router = express.Router();

/**
 * This page lists all users
 */
router.get("/list-users", (req, res, next) => {
  // Define query
  query = "SELECT * FROM users";
  // Execute query and render page with the results
  global.db.all(query, function (err, rows) {
    if (err) {
      next(err); // Send the error to the error handler
    } else {
      res.json(rows); // Render page as base JSON
    }
  });
});

/**
 * This page displays a form for creating new user records
 */
router.get("/add-user", (req, res) => {
  res.render("add-user.ejs");
});

/**
 * This page is displayed after ^ is submitted
 *
 * It adds a new user to database based on form's submitted data
 */
router.post("/add-user", (req, res, next) => {
  // Define query and its variable
  query = "INSERT INTO users (user_name) VALUES( ? );";
  query_parameters = [req.body.user_name];
  // Execute query and render page with confirmation message
  global.db.run(query, query_parameters, function (err) {
    if (err) {
      next(err); // Send the error to the error handler
    } else {
      res.send(`New data inserted @ id ${this.lastID}!`);
      next();
    }
  });
});

// Export this router so index.js can access it
module.exports = router;
