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

INSERT INTO settings
VALUES (1, 'Adventures in Code', 'Simon K');

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('draft', 'published', 'deleted')),
  title TEXT NOT NULL,
  subtitle TEXT, -- Optional
  body TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP -- Also refers to published datetime
);

INSERT INTO articles (category, title, subtitle, body)
VALUES (
    'draft',
    'Favourite Daft Punk Song',
    'Not my favourite, but my girlfriend''s favourite',
    'Daft Punk - Instant Crush ft. Julian Casablancas

[Verse 1]
I didn''t want to be the one to forget
I thought of everything I''d never regret
A little time with you is all that I get
That''s all we need because it''s all we can take
One thing I never see the same when you''re ''round
I don''t believe in him, his lips on the ground
I wanna take you to that place in the Roche
But no one gives us any time anymore
He asks me once if I''d look in on his dog
You made an offer for it, then you ran off
I got this picture of us kids in my head
And all I hear is the last thing that you said

[Pre-Chorus]
"I listened to your problems, now listen to mine"
I didn''t want to anymore, oh-oh-oh

[Chorus]
And we will never be alone again
''Cause it doesn''t happen every day
Kinda counted on you being a friend
Can I give it up or give it away?
Now I thought about what I wanna say
But I never really know where to go
So I chained myself to a friend
''Cause I know it unlocks like a door
And we will never be alone again
''Cause it doesn''t happen every day
Kinda counted on you being a friend
Can I give it up or give it away?
Now I thought about what I wanna say
But I never really know where to go
So I chained myself to a friend
Some more again'
);

INSERT INTO articles (category, title, subtitle, body, views, likes)
VALUES (
    'published',
    'Bee movie script (snippet)',
    'y''know what it is',
    'Scripts.com
Bee Movie
By Jerry Seinfeld

NARRATOR:
(Black screen with text; The sound of buzzing bees can be heard)
According to all known laws
of aviation,
 :
there is no way a bee
should be able to fly.
 :
Its wings are too small to get
its fat little body off the ground.
The bee, of course, flies anyway
 :
because bees don''t care
what humans think is impossible.',
    6,
    9
);

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
