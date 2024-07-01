const express = require("express");
const router = express.Router();

/**
 * router.get(): represents browser URL  (has "/author" prefix)
 * res.render(): represents file to load (no prefix)
 */

let pathToFile = "reader/";

router.get("/", (req, res, next) => {
  res.render(pathToFile + "reader-index", { pageName: "Home (reader)" });
});

router.get("/read-article", (req, res, next) => {
  res.render(pathToFile + "reader-read-article", { pageName: "Read article" });
});

// Export this router so index.js can access it
module.exports = router;
