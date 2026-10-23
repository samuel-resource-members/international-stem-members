ALTER TABLE user ADD COLUMN github_login TEXT;
ALTER TABLE activation_codes ADD COLUMN bound_github_id TEXT;
ALTER TABLE activation_codes ADD COLUMN bound_github_login TEXT;
ALTER TABLE memberships ADD COLUMN github_id TEXT;
UPDATE activation_codes SET revoked=1 WHERE used_by IS NULL;
CREATE UNIQUE INDEX github_account_subject ON account(providerId,accountId) WHERE providerId='github';
CREATE UNIQUE INDEX membership_github_subject ON memberships(github_id) WHERE github_id IS NOT NULL;
CREATE INDEX activation_github_subject ON activation_codes(bound_github_id);
INSERT INTO activation_codes(id,code_hash,suffix,label,role,bound_github_id,bound_github_login,created_at)
VALUES('github-owner','internal:github-owner','','所有者','admin','237370912','samuelyeung-space',unixepoch()*1000);
