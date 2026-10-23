CREATE TABLE repository_access (
 user_id TEXT PRIMARY KEY REFERENCES memberships(user_id),
 github_id TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','invited','ready','revoked','blocked','retry')),
 github_login TEXT,
 invitation_id INTEGER,
 last_error TEXT,
 updated_at INTEGER NOT NULL,
 next_attempt_at INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1,
 lease_id TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 cleanup_invitation_id INTEGER,
 cleanup_github_id TEXT,
 cleanup_login TEXT
);
CREATE INDEX repository_access_due ON repository_access(next_attempt_at,lease_until);
INSERT INTO repository_access(user_id,github_id,updated_at)
 SELECT user_id,github_id,unixepoch()*1000 FROM memberships
 WHERE role='member' AND github_id IS NOT NULL AND github_id<>'237370912';
