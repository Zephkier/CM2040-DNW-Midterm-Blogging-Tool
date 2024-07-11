# CM2040 DNW Midterm Submission

<b><i>Edit this `README.md` to explain any specific instructions for setting up or using your application that you want to bring to our attention:

-   include any settings that should be adjusted in configuration files
-   include a list of the additional libraries you are using
-   anything else we need to know in order to successfully run your app

We will only run `npm install`, `npm run build-db`, and `npm run start`.
We will not install additional packages to run your code and will not run additional build scripts.</i></b>

## 1. Settings and Configuration

None.

## 2. Additional Libraries Used

### 2.1. `package.json`

Packages (and scripts) used during development. This is left untouched in `package.json`:

```json
"scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build-db": "cat db_schema.sql | sqlite3 database.db #build anew database from the sql file",
    "clean-db": "rm database.db #remove the old database",
    "build-db-win": "sqlite3 database.db < db_schema.sql",
    "clean-db-win": "del database.db",
    "start": "node index.js",
    "devStart": "nodemon index.js",
    "restart-db": "npm run clean-db-win && npm run build-db-win"
},
"dependencies": {
    "ejs": "^3.1.8",
    "express": "^4.18.2",
    "express-session": "^1.18.0",
    "express-validator": "^7.1.0",
    "sqlite3": "^5.1.2",
    "striptags": "^3.2.0"
},
"engines": {
    "npm": ">=8.0.0",
    "node": ">=16.0.0"
},
"devDependencies": {
    "nodemon": "^3.1.4"
}
```

-   **nodemon** was used to help streamline the development process.
    -   It auto-refreshes the server upon saving a `.js` file, which increased productivity.

<br>

-   **striptags** was used after implementing my rich text editor (RTE), which uses `HTML` to format the article's body text.
    -   Due to the implementation of my **home (reader) page**, it displays a shortened article's body.
    -   This caused `HTML` tags to be left unclosed, which disrupted the page's formatting.
    -   Thus, **striptags** was needed to remove all `HTML` tags consistently for all articles to be displayed as intended.

<br>

-   **express-validator** was used to help with form validation as taught my by university lecturer.

<br>

-   **express-sesssion** was used to help implement user authentication and differentiate access across the app, based on user roles, such as author and reader.

### 2.2. `package-lock.json`

![alt text](<README terminal error.png>)

Based on the provided `package-lock.json`, it has few vulnerabilities upon `npm i`.
Also left untouched throughout development.

## 3. Additional Notes

### 3.1 Users and Accounts

To gain better understanding:

-   **Non-users:** only allowed to read articles; must create account for more features.
-   **Users:** able to be author and/or reader.
    -   Users may choose **not to** create a blog.
    -   Users can read, comment on, and like articles.

Only usernames and passwords are required.
Passwords are naively stored as plain text in the database.

You may create a new account, or login with a preset one:

| Username | Password |
| -------- | -------- |
| admin    | admin    |
| normal   | normal   |
| admin    | admin    |
| bee      | bee      |
| shrek    | shrek    |

### 3.2 Error Pages

Due to time contraints, no proper error pages were implemented.

Instead, a `response.send()` with a custom-created Crash ID (typically for invalid database queries) and error message is presented.

Crash IDs reference:

-   `IR001` correponds to an error within `index-router.js`
-   `A001` correponds to an error within `author.js`
-   `R001` correponds to an error within `reader.js`
-   `M001` correponds to an error within `middleware.js`

### 3.3 Overall Directory Structure

    .
    ├── node_modules/
    │
    ├── public/
    │   ├── main.css
    │   └── rich-text-editor.js
    │
    ├── routes/
    │   ├── index-router.js
    │   ├── author.js
    │   └── reader.js
    │
    ├── utils/
    │   ├── db.js
    │   └── middleware.js
    │
    ├── views/
    │   ├── partials/
    │   │   └── 2x .ejs files (header-nav, footer)
    │   │
    │   ├── author/
    │   │   └── 4x .ejs files (home, settings, create-blog, article)
    │   │
    │   ├── reader/
    │   │   └── 4x .ejs files (home, blog, article, likes)
    │   │
    │   └── 3x .ejs files (index, login, sign-up)
    │
    ├── index.js
    └── package.json and so on
