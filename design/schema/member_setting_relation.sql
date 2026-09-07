-- source: hub for credit × group × business combinations
--   - replaces v2 member_setting M2M (member_setting_id + related_id)
--   - one row = one selectable profile (e.g. U01-อู่ / เงินสด / ราคาปลีก)
--   - consumer tables reference relation.id (not credit/group/business directly)
CREATE TABLE member_setting_relation (
    id          BIGSERIAL PRIMARY KEY,              -- surrogate PK
    credit_id   BIGINT NOT NULL REFERENCES member_setting_credit(id)   ON DELETE RESTRICT, -- payment format
    group_id    BIGINT NOT NULL REFERENCES member_setting_group(id)    ON DELETE RESTRICT, -- pricing group
    business_id BIGINT NOT NULL REFERENCES member_setting_business(id) ON DELETE RESTRICT, -- business group
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,    -- whether combo is selectable
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_setting_relation_combo
    ON member_setting_relation (credit_id, group_id, business_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_setting_relation_credit   ON member_setting_relation (credit_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_member_setting_relation_group    ON member_setting_relation (group_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_setting_relation_business ON member_setting_relation (business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_setting_relation_active   ON member_setting_relation (id)          WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_member_setting_relation_created_by ON member_setting_relation (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_setting_relation_updated_by ON member_setting_relation (updated_by) WHERE updated_by IS NOT NULL;
