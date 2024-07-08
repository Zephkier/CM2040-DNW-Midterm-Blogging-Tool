// Import and setup modules
const express = require("express");
const authorRouter = require("./author.js");
const readerRouter = require("./reader.js");

// Use router and set its browser URL endpoint prefix
const router = express.Router();
router.use("/author", authorRouter);
router.use("/reader", readerRouter);

// Export module containing the following so external files can access it
module.exports = router;
