-- Ensures that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

-- Create tables with SQL commands (watch out for slight syntactical differences with SQLite vs MySQL)
BEGIN TRANSACTION;

-- So there are non-users: only view (like reader but limited eg. cannot like, comment)
-- And there are users   : can be author or reader
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE ,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS articles_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK(category IN ('draft', 'published', 'deleted')),
    title TEXT NOT NULL,
    subtitle TEXT, -- Optional
    body TEXT NOT NULL,  -- Can insert as plain text or HTML, but app turns it into HTML to apply text formatting from rich text editor
    body_plain TEXT, -- Same as body but with no HTML tags, used in home (reader) page to avoid missing closing HTML tags affecting that page; inspired from Blogger
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Used as published date too
    blog_id INTEGER NOT NULL,
    FOREIGN KEY (blog_id) REFERENCES blogs(id)
);

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles_v2(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles_v2(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Old below
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_title TEXT NOT NULL,
    author_name TEXT NOT NULL
);

INSERT INTO settings
VALUES (1, 'Adventures in Code', 'Simon K');

CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK(category IN ('draft', 'published', 'deleted')),
    title TEXT NOT NULL,
    -- Optional
    subtitle TEXT,
    -- Can insert as plain text or HTML
    -- But app will eventually turn it into HTML due to text formatting (from rich text editor)
    body TEXT NOT NULL, 
    -- This is the same as body, but with no HTML tags at all
    -- Used in home (reader) page to avoid missing closing HTML tags affecting that page; inspired from Blogger
    body_plain TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Used as published date too
    date_modified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Demonstration of HTML body (complicated)
INSERT INTO articles (category, title, subtitle, body)
VALUES (
    'draft',
    'Favourite Daft Punk Song',
    'Not my favourite, but my girlfriend''s favourite',
    '<h1><i style=""><u style=""><font color="#cd1d1d" face="Georgia" style="background-color: rgb(196, 89, 217);">Daft P</font><font color="#cd1d1d" face="Georgia" style="background-color: rgb(62, 48, 207);">unk - Instant C</font><span style="background-color: rgb(57, 182, 213);"><font color="#cd1d1d" face="Georgia" style="">ru</font><font color="#cd1d1d" face="Georgia" style="">sh ft. Jul</font></span><font color="#cd1d1d" face="Georgia" style="background-color: rgb(196, 89, 217);">ian Ca</font><font color="#cd1d1d" face="Georgia" style="background-color: rgb(159, 199, 209);">sablanca</font><font color="#cd1d1d" face="Georgia" style="background-color: rgb(196, 89, 217);">s</font></u></i></h1> <div><br></div> <h2><font face="cursive">[Verse 1]</font></h2> <div><b>I didn''t want to be the one to forget</b></div> <div>I thought of everything I''d never regret</div> <div><b>A little time with you is all that I get</b></div> <div>That''s all we need because it''s all we can take</div> <div><i><u>One thing I never see the same when you''re ''round</u></i></div> <div>I don''t believe in him, his lips on the ground</div> <div><i><u>I wanna take you to that place in the Roche</u></i></div> <div>But no one gives us any time anymore</div> <div><ol><li>He asks me once if I''d look in on his dog</li></ol></div> <div>You made an offer for it, then you ran off</div> <div><ol><li>I got this picture of us kids in my head</li></ol></div> <div>And all I hear is the last thing that you said</div> <div><br></div> <div>[Pre-<sup>Chorus</sup>]</div> <div><ul><li>"I listened to your problems, now listen to mine"</li><li>I didn''t want to anymore, oh-oh-oh</li></ul></div> <div><br></div> <div>[Chorus]</div> <div>And we will never be alone again</div> <div>''Cause it doesn''t happen every day</div> <div>Kinda counted on you being a friend</div> <div>Can I give it up or give it away?</div> <div>Now I thought about what I wanna say</div> <div>But I never really know where to go</div> <div>So I chained myself to a friend</div> <div>''Cause I know it unlocks like a door</div> <div>And we will never be alone again</div> <div>''Cause it doesn''t happen every day</div> <div>Kinda counted on you being a friend</div> <div>Can I give it up or give it away?</div> <div>Now I thought about what I wanna say</div> <div>But I never really know where to go</div> <div>So I chained myself to a friend</div> <div>Some more again</div>'
);

-- Demonstration of HTML body (simple)
INSERT INTO articles (category, title, subtitle, body, views, likes)
VALUES (
    'published',
    'Bee movie script (snippet)',
    'y''know what it is',
    '<div>Scripts.com</div> <div>Bee Movie</div> <div>By Jerry Seinfeld</div> <div><br></div> <div>NARRATOR:</div> <div>(Black screen with text; The sound of buzzing bees can be heard)</div> <div>According to all known laws</div> <div>of aviation,</div> <div> :</div> <div>there is no way a bee</div> <div>should be able to fly.</div> <div> :</div> <div>Its wings are too small to get</div> <div>its fat little body off the ground.</div> <div>The bee, of course, flies anyway</div> <div> :</div> <div>because bees don''t care</div> <div>what humans think is impossible.</div>',
    6,
    9
);

-- Demonstration of plain text body
INSERT INTO articles (category, title, subtitle, body)
VALUES (
    'deleted',
    'Diary of a Wimpy Kid (Book 1)',
    'by Jeff Kinney',
    'September

Tuesday

First of all, let me get something straight: This
is a Journal, not a diary. I know what it
says on the cover, but when Mom went out to
buy this thing I specifically told her to
get one that didn''t say "diary" on it.

Great. All I need is for some jerk to catch me
carrying this book around and get the wrong idea.'
);

COMMIT;
