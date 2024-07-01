/**
 * App's main entry point
 */

// Import and setup modules (global variables are accessible throughout app)
const express = require("express");
const app = express();
app.set("view engine", "ejs"); // Tells Express to use EJS as templating engine
app.use(express.static(__dirname + "/public")); // Set location of static files

let bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true })); // Set Body-parser middleware

const sqlite3 = require("sqlite3").verbose();
global.db = new sqlite3.Database("./database.db", function (err) {
  if (err) {
    console.error(err);
    process.exit(1); // Can't connect to database, bail out
  } else {
    console.log("Database connected");
    global.db.run("PRAGMA foreign_keys=ON"); // Tells SQLite to note foreign key constraints
  }
});

// Handle requests to the home page
app.get("/", (req, res) => {
  res.send("Hello world!");
});

// Import router from external file and set app's default path's prefix (eg. "/users")
const usersRouter = require("./routes/users");
app.use("/users", usersRouter);

// Make app listen for HTTP requests
const port = 3000;
app.listen(port, () => {
  console.log(`App's server listening at http://localhost:${port}`);
});
