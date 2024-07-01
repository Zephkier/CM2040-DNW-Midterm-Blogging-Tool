-- Ensures that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Create tables with SQL commands (watch out for slight syntactical differences with SQLite vs MySQL)
-- And insert default data if necessary
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_title TEXT NOT NULL,
  author_name TEXT NOT NULL
);

-- INSERT INTO settings
-- VALUES (1, 'Adventures in Code', 'Simon K');

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('draft', 'published', 'deleted')),
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT NOT NULL,
  datetime_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  datetime_last_modified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- INSERT INTO articles (category, title, subtitle, body, datetime_created, datetime_last_modified)
-- VALUES (
--     'draft',
--     'some title',
--     'subtitle subtitle subtitle subtitle subtitle',
--     'body ody ody ody ody ody ody ody ody ody ody ody ody ody ody ody ody ody ody ody ody ody ody.',
--     CURRENT_TIMESTAMP,
--     CURRENT_TIMESTAMP
-- );

-- INSERT INTO articles (category, title, subtitle, body, datetime_created, datetime_last_modified)
-- VALUES (
--     'draft',
--     'title 2',
--     '',
--     'in all known laws of aviation, there should be no way for a bee to "HEY!"',
--     CURRENT_TIMESTAMP,
--     CURRENT_TIMESTAMP
-- );

-- INSERT INTO articles (category, title, subtitle, body, datetime_created, datetime_last_modified)
-- VALUES (
--     'published',
--     'diary of a wimpy kid: rodrick rules',
--     '',
--     'asdfmovie',
--     CURRENT_TIMESTAMP,
--     CURRENT_TIMESTAMP
-- );

-- INSERT INTO articles (category, title, subtitle, body, datetime_created, datetime_last_modified)
-- VALUES (
--     'deleted',
--     'my failed article...',
--     '',
--     'we don''t talk about this... ever.',
--     CURRENT_TIMESTAMP,
--     CURRENT_TIMESTAMP
-- );

COMMIT;
