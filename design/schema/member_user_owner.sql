-- source: v1 member_members_admin_users + v2 v2_member_members_admin_users (renamed member_member_owner)
-- junction: admin users who "own" / manage this member account
CREATE TABLE member_user_owner (
    member_user_id  BIGINT NOT NULL REFERENCES member_user(id) ON DELETE CASCADE, -- member account
    admin_user_id   BIGINT NOT NULL REFERENCES admin_user(id)  ON DELETE CASCADE, -- managing admin user
    PRIMARY KEY (member_user_id, admin_user_id)
);

CREATE INDEX idx_member_user_owner_admin ON member_user_owner (admin_user_id);
