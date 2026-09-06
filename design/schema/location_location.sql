-- source: v1 location_locations (module location; custom named locations for warehouse/store pickers)
CREATE TABLE location_location (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sort_order  INTEGER      NOT NULL DEFAULT 0,       -- UI list order
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in location pickers
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_location_location_active_sort ON location_location (sort_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_location_location_created_by  ON location_location (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_location_location_updated_by  ON location_location (updated_by) WHERE updated_by IS NOT NULL;
