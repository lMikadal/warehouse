-- source: v2 v2_member_members_member_setting (renamed member_member_setting)
--         (replaces v1 member_members_member_credit_types + member_members_member_group_types)
-- junction: which member profile combo (credit × group × business) a member belongs to
CREATE TABLE member_user_setting (
    member_user_id               BIGINT NOT NULL REFERENCES member_user(id)              ON DELETE CASCADE, -- member
    member_setting_relation_id   BIGINT NOT NULL REFERENCES member_setting_relation(id) ON DELETE RESTRICT, -- profile combo
    PRIMARY KEY (member_user_id, member_setting_relation_id)
);

CREATE INDEX idx_member_user_setting_relation ON member_user_setting (member_setting_relation_id);
