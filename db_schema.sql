-- Note syntax differences with SQLite vs MySQL

-- Ensure foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- There are...
-- Non-users: only view blogs and its articles, cannot like and comment
-- Users    : acts as author and reader

-- To prevent myself overworking and being short on time, users can only have 1 blog

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

CREATE TABLE IF NOT EXISTS articles (
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
    body TEXT NOT NULL,
    date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (article_id) REFERENCES articles(id)
);

CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- Create Admin user first (id = 1), and then Normal user (id = 2)
INSERT INTO users (username, password, display_name) VALUES ('admin', 'admin', 'Admin Aaron');
INSERT INTO users (username, password, display_name) VALUES ('normal', 'normal', 'Normal Norman');

-- Create Normal's blog first (id = 1), and then Admin's blog (id = 2) (just to change things up)
INSERT INTO blogs (title, user_id) VALUES ('Normal Nlog of Norman', 2);
INSERT INTO blogs (title, user_id) VALUES ('Adventures in Aode', 1);

-- Demo of body in plain text, put into Normal's blog first (2 published, 3 drafts)
INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'published',
    'Norman''s Book 2: Rodrick Rules',
    '"This is a very long subtitle to showcase cut off and the 3 periods at the end"',
    'Actually, I don''t know how book 2 started. So here''s book 1 instead.

September

Tuesday

First of all, let me get something straight: This
is a Journal, not a diary. I know what it
says on the cover, but when Mom went out to
buy this thing I specifically told her to
get one that didn''t say "diary" on it.

Great. All I need is for some jerk to catch me
carrying this book around and get the wrong idea.',
    1
);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES ('published', 'Nimble Norman', 'Nifty Notions', 'Norman navigates numerous narrow niches, noting novel nuances.', 1);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES ('draft', 'Noble Norman', 'Nurturing Nature', 'Noble Norman nurtures nature, never neglecting native nuances, nurturing noble notions.', 1);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES ('draft', 'Nostalgic Norman', 'Nostalgic Narratives', 'Nostalgic Norman narrates noteworthy narratives, navigating nostalgic nuances, nurturing noble notions.', 1);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES ('draft', 'Nifty Norman', 'New Notions', 'Nifty Norman notices new notions, navigating novel niches, nurturing native narratives.', 1);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES ('draft', 'Noble Norman', 'Nurturing Narratives', 'Noble Norman narrates nurturing narratives, noting novel nuances, nurturing native notions.', 1);

-- Demo of body with HTML tags, put into Admin's blog next (2 published, 3 drafts)
INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'published',
    'Admin''s favourite published song',
    'Actuallyyyyy it''s my girlfriend''s favourite, not mine, but I like it too',
    '<h1><i style=""><u style=""><font color="#cd1d1d" face="Georgia" style="background-color: rgb(196, 89, 217);">Daft P</font><font color="#cd1d1d" face="Georgia" style="background-color: rgb(62, 48, 207);">unk - Instant C</font><span style="background-color: rgb(57, 182, 213);"><font color="#cd1d1d" face="Georgia" style="">ru</font><font color="#cd1d1d" face="Georgia" style="">sh ft. Jul</font></span><font color="#cd1d1d" face="Georgia" style="background-color: rgb(196, 89, 217);">ian Ca</font><font color="#cd1d1d" face="Georgia" style="background-color: rgb(159, 199, 209);">sablanca</font><font color="#cd1d1d" face="Georgia" style="background-color: rgb(196, 89, 217);">s</font></u></i></h1> <div><br></div> <h2><font face="cursive">[Verse 1]</font></h2> <div><b>I didn''t want to be the one to forget</b></div> <div>I thought of everything I''d never regret</div> <div><b>A little time with you is all that I get</b></div> <div>That''s all we need because it''s all we can take</div> <div><i><u>One thing I never see the same when you''re ''round</u></i></div> <div>I don''t believe in him, his lips on the ground</div> <div><i><u>I wanna take you to that place in the Roche</u></i></div> <div>But no one gives us any time anymore</div> <div><ol><li>He asks me once if I''d look in on his dog</li></ol></div> <div>You made an offer for it, then you ran off</div> <div><ol><li>I got this picture of us kids in my head</li></ol></div> <div>And all I hear is the last thing that you said</div> <div><br></div> <div>[Pre-<sup>Chorus</sup>]</div> <div><ul><li>"I listened to your problems, now listen to mine"</li><li>I didn''t want to anymore, oh-oh-oh</li></ul></div> <div><br></div> <div>[Chorus]</div> <div>And we will never be alone again</div> <div>''Cause it doesn''t happen every day</div> <div>Kinda counted on you being a friend</div> <div>Can I give it up or give it away?</div> <div>Now I thought about what I wanna say</div> <div>But I never really know where to go</div> <div>So I chained myself to a friend</div> <div>''Cause I know it unlocks like a door</div> <div>And we will never be alone again</div> <div>''Cause it doesn''t happen every day</div> <div>Kinda counted on you being a friend</div> <div>Can I give it up or give it away?</div> <div>Now I thought about what I wanna say</div> <div>But I never really know where to go</div> <div>So I chained myself to a friend</div> <div>Some more again</div>',
    2
);
INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'published', 
    'Admin Aaron', 
    'Amazing Adventures', 
    '<h1><i><u><font color="#0000FF">Admin Aaron''s Adventures</font></u></i></h1> 
    <p><b>Admin Aaron always appreciates amazing adventures, astonishing achievements, and ample amusement.</b></p>
    <div><i>Admin Aaron assembles awesome anecdotes, attracting audiences avidly.</i></div>
    <div><u>Admin Aaron aims at achieving all ambitions.</u></div>
    <div><ol><li>Adventure awaits Admin Aaron.</li></ol></div>', 
    2
);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'draft', 
    'Admin''s Awesome Article', 
    'Astonishing Anecdotes', 
    '<h1><i><u><font color="#008000">Admin''s Awesome Article</font></u></i></h1> 
    <p><b>Always aspiring, Admin achieves amazing accomplishments.</b></p>
    <div><i>Admin Aaron analyzes all aspects, appreciating art and architecture.</i></div>
    <div><u>Admin articulates anecdotes, amusing and astounding all.</u></div>
    <div><ul><li>Admin Aaron''s article attracts avid admirers.</li></ul></div>', 
    2
);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'draft', 
    'Admin Aaron''s Aspirations', 
    'Ambitious Achievements', 
    '<h1><i><u><font color="#FF4500">Admin Aaron''s Aspirations</font></u></i></h1> 
    <p><b>Admin Aaron always aims at ambitious achievements, approaching all activities ardently.</b></p>
    <div><i>Admin appreciates an array of amazing adventures.</i></div>
    <div><u>Admin Aaron aims to achieve all admirable aspirations.</u></div>
    <div><ol><li>Admin''s aspirations are always admirable.</li></ol></div>', 
    2
);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'draft', 
    'Admin Aaron''s Anecdotes', 
    'Astonishing Stories', 
    '<h1><i><u><font color="#FF6347">Admin Aaron''s Anecdotes</font></u></i></h1> 
    <p><b>Anecdotes always amuse Admin Aaron, adding amazing adventures to archives.</b></p>
    <div><i>Admin Aaron articulates anecdotes, astonishing all audiences.</i></div>
    <div><u>Admin''s anecdotes are always admired.</u></div>
    <div><ul><li>Astonishing anecdotes attract avid audiences.</li></ul></div>', 
    2
);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'published', 
    'Admin Aaron''s Adventures', 
    'Amazing Experiences', 
    '<h1><i><u><font color="#800080">Admin Aaron''s Adventures</font></u></i></h1> 
    <p><b>Admin Aaron always achieves amazing adventures, admiring all accomplishments.</b></p>
    <div><i>Admin Aaron appreciates all adventures, aiming to achieve admirable aims.</i></div>
    <div><u>Admin always acts actively, admiring all achievements.</u></div>
    <div><ol><li>Adventures always await Admin Aaron.</li></ol></div>', 
    2
);

-- Admin and Normal commenting on each other's 1st published articles
INSERT INTO comments (user_id, article_id, body)
VALUES (1, 1, 'okay greg heffley or whatever his name was');
INSERT INTO comments (user_id, article_id, body)
VALUES (2, 7, 'what are you on the about have you heard charli xcx BRAT?!');

-- Admin and Normal liking each other's published articles (must insert-likes and update-articles)
INSERT INTO likes (user_id, article_id) VALUES (1, 1);
INSERT INTO likes (user_id, article_id) VALUES (2, 7);
UPDATE articles SET likes = likes + 1 WHERE id = 1;
UPDATE articles SET likes = likes + 1 WHERE id = 7;

-- Populate with more variety
INSERT INTO users (username, password, display_name) VALUES ('bee', 'bee', 'Bee Man');
INSERT INTO blogs (title, user_id) VALUES ('B for Beez', 3);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'published',
    'The Bee Movie Script (snippet)',
    'Ya like jazz?',
    '<div>Scripts.com</div> <div>Bee Movie</div> <div>By Jerry Seinfeld</div> <div><br></div> <div>NARRATOR:</div> <div>(Black screen with text; The sound of buzzing bees can be heard)</div> <div>According to all known laws</div> <div>of aviation,</div> <div> :</div> <div>there is no way a bee</div> <div>should be able to fly.</div> <div> :</div> <div>Its wings are too small to get</div> <div>its fat little body off the ground.</div> <div>The bee, of course, flies anyway</div> <div> :</div> <div>because bees don''t care</div> <div>what humans think is impossible.</div>',
    3
);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'published',
    'Barry B. Benson''s Introduction',
    'Yellow, black. Yellow, black.',
    '<div>Scripts.com</div> <div>Bee Movie</div> <div>By Jerry Seinfeld</div> <div><br></div> <div>Barry B. Benson:</div> <div>Yellow, black. Yellow, black. Yellow, black. Yellow, black. Ooh, black and yellow!</div> <div>Let''s shake it up a little.</div> <div>Barry!</div> <div>Breakfast is ready!</div> <div>Coming!</div> <div>Hang on a second.</div> <div>Hello?</div> <div>- Barry?</div> <div>- Adam?</div>',
    3
);

INSERT INTO users (username, password, display_name) VALUES ('shrek', 'shrek', 'Shrek Ogre');
INSERT INTO blogs (title, user_id) VALUES ('S for Shrek', 4);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'published',
    'Shrek Script (snippet)',
    'What are you doing in my swamp?',
    '<div>Scripts.com</div> <div>Shrek</div> <div>By William Steig</div> <div><br></div> <div>SHREK:</div> <div>(to Donkey) What are you doing in my swamp?</div> <div><br></div> <div>DONKEY:</div> <div>Oh, this is gonna be fun. We can stay up late, swapping manly stories, and in the morning, I''m making waffles.</div>',
    4
);

INSERT INTO articles (category, title, subtitle, body, blog_id)
VALUES (
    'published',
    'Shrek and Donkey',
    'Layers. Onions have layers.',
    '<div>Scripts.com</div> <div>Shrek</div> <div>By William Steig</div> <div><br></div> <div>SHREK:</div> <div>For your information, there''s a lot more to ogres than people think.</div> <div>DONKEY:</div> <div>Example?</div> <div>SHREK:</div> <div>Example? Okay, um... ogres are like onions.</div> <div>DONKEY:</div> <div>(sniffs) They stink?</div> <div>SHREK:</div> <div>Yes... No!</div> <div>DONKEY:</div> <div>They make you cry?</div> <div>SHREK:</div> <div>No!</div> <div>DONKEY:</div> <div>You leave them out in the sun, they get all brown, start sprouting little white hairs.</div> <div>SHREK:</div> <div>No! Layers. Onions have layers. Ogres have layers. Onions have layers. You get it? We both have layers.</div>',
    4
);

COMMIT;
