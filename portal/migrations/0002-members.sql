CREATE TABLE activation_codes (
 id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, suffix TEXT NOT NULL,
 label TEXT NOT NULL DEFAULT '', bound_email TEXT, role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
 expires_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0, used_by TEXT REFERENCES user(id), redeemed_at INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE memberships (
 user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('admin','member')), status TEXT NOT NULL CHECK(status IN ('active','suspended')),
 code_id TEXT NOT NULL UNIQUE REFERENCES activation_codes(id), activated_at INTEGER NOT NULL
);
CREATE TABLE request_limits (id TEXT PRIMARY KEY, window INTEGER NOT NULL, hits INTEGER NOT NULL);
CREATE TABLE submissions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id), title TEXT NOT NULL, course TEXT NOT NULL,
 details TEXT NOT NULL, url TEXT, file_name TEXT, file_size INTEGER, object_key TEXT,
 status TEXT NOT NULL CHECK(status IN ('draft','pending','approved','rejected')),
 created_at INTEGER NOT NULL, reviewed_at INTEGER, reviewer_id TEXT REFERENCES user(id)
);
CREATE INDEX submissions_status_created ON submissions(status,created_at);
CREATE INDEX submissions_user_created ON submissions(user_id,created_at);
