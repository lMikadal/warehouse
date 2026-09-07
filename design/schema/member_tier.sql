-- source: v1 member_tiers + v2 v2_member_tiers (UUID→BIGSERIAL)
--   - tree: parent_id + tree_path + sort_order (hierarchical tiers)
--   - is_default: partial unique ensures at most one default tier (v2 addition — kept)
--   - image_url → website_file_id (purpose: member_tier_badge)
--   - purchase/discount/type/is_promotion: tier defaults when no member_tier_relation row matches
CREATE TABLE member_tier (
    id              BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    website_file_id BIGINT       REFERENCES website_file(id) ON DELETE RESTRICT, -- tier badge or thumbnail (purpose: member_tier_badge)
    parent_id       BIGINT       REFERENCES member_tier(id) ON DELETE RESTRICT, -- parent tier in hierarchy
    tree_path       LTREE        NOT NULL,                 -- LTREE path for subtree queries
    sort_order      INTEGER      NOT NULL DEFAULT 0,       -- sibling display order
    is_default      BOOLEAN      NOT NULL DEFAULT FALSE,   -- fallback tier when none assigned
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,    -- whether tier is selectable
    purchase_start  NUMERIC(15,4) NOT NULL DEFAULT 0,       -- default min purchase amount threshold
    purchase_end    NUMERIC(15,4) NOT NULL DEFAULT 0,       -- default max purchase amount threshold
    discount        NUMERIC(15,4) NOT NULL DEFAULT 0,       -- default discount value
    discount_type   discount_unit NOT NULL DEFAULT 'percent', -- default discount unit
    type            member_tier_relation_type NOT NULL DEFAULT 'all', -- default product scope
    is_promotion    BOOLEAN      NOT NULL DEFAULT FALSE,   -- default: count promotional products
    deleted_at      TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_member_tier_tree_path USING GIST ON member_tier (tree_path);
CREATE UNIQUE INDEX uq_member_tier_tree_path
    ON member_tier (tree_path)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_member_tier_one_default
    ON member_tier ((TRUE))
    WHERE deleted_at IS NULL AND is_default = TRUE;
CREATE INDEX idx_member_tier_parent_sort
    ON member_tier (parent_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_tier_active_sort ON member_tier (sort_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_member_tier_file        ON member_tier (website_file_id) WHERE website_file_id IS NOT NULL;
CREATE INDEX idx_member_tier_created_by  ON member_tier (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_tier_updated_by  ON member_tier (updated_by) WHERE updated_by IS NOT NULL;
