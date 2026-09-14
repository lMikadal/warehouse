-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TYPE entity_branch AS ENUM ('headquarter', 'branch');
CREATE TYPE discount_unit AS ENUM ('percent', 'baht');
CREATE TYPE claim_type AS ENUM ('claim', 'return');
CREATE TYPE claim_item_status AS ENUM ('confirmed', 'rejected');
CREATE TYPE member_tier_relation_type AS ENUM ('all', 'brand', 'category', 'except_brand', 'except_category');
CREATE TYPE member_user_type AS ENUM ('person', 'company');

CREATE TYPE admin_user_status AS ENUM ('active', 'inactive', 'suspended', 'locked');
CREATE TYPE admin_user_type AS ENUM ('superadmin', 'owner', 'manager', 'staff');

CREATE TYPE system_permission_action AS ENUM ('view', 'create', 'update', 'delete', 'import', 'export');
CREATE TYPE system_permission_method AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

CREATE TABLE admin_role (
    id          BIGSERIAL   PRIMARY KEY,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT,
    updated_by  BIGINT
);

CREATE TABLE admin_user (
    id                     BIGSERIAL         PRIMARY KEY,
    username               VARCHAR(100)      NOT NULL,
    email                  VARCHAR(255),
    password_hash          VARCHAR(255)      NOT NULL,
    password_credit_hash   VARCHAR(255),
    password_discount_hash VARCHAR(255),
    status                 admin_user_status NOT NULL DEFAULT 'active',
    type                   admin_user_type   NOT NULL DEFAULT 'staff',
    admin_role_id          BIGINT            REFERENCES admin_role(id) ON DELETE SET NULL,
    last_login_at          TIMESTAMPTZ,
    failed_login_attempts  INTEGER           NOT NULL DEFAULT 0,
    locked_until           TIMESTAMPTZ,
    deleted_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by             BIGINT            REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by             BIGINT            REFERENCES admin_user(id) ON DELETE SET NULL
);

ALTER TABLE admin_role
    ADD CONSTRAINT admin_role_created_by_fkey FOREIGN KEY (created_by) REFERENCES admin_user(id) ON DELETE SET NULL,
    ADD CONSTRAINT admin_role_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES admin_user(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_admin_user_username ON admin_user (LOWER(username)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_admin_user_email ON admin_user (LOWER(email)) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX idx_admin_user_role ON admin_user (admin_role_id) WHERE admin_role_id IS NOT NULL;
CREATE INDEX idx_admin_role_active_not_deleted ON admin_role (created_at) WHERE deleted_at IS NULL AND is_active = TRUE;

CREATE TABLE website_language (
    id          BIGSERIAL    PRIMARY KEY,
    locale      VARCHAR(10)  NOT NULL,
    name        VARCHAR(255) NOT NULL,
    sort_order  INTEGER      NOT NULL DEFAULT 100,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_website_language_locale UNIQUE (locale),
    CONSTRAINT chk_website_language_locale CHECK (locale ~ '^[a-z]{2,10}$')
);

CREATE UNIQUE INDEX uq_website_language_one_default ON website_language ((TRUE)) WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE TABLE system_permission (
    id        BIGSERIAL NOT NULL PRIMARY KEY,
    code      VARCHAR(255) NOT NULL,
    module    VARCHAR(100) NOT NULL,
    type      VARCHAR(100) NOT NULL,
    action    system_permission_action NOT NULL,
    resource  VARCHAR(255) NOT NULL,
    method    system_permission_method NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_system_permission_code UNIQUE (code),
    CONSTRAINT chk_system_permission_code_format CHECK (code = module || '.' || type || '.' || action::text)
);

CREATE TABLE system_menu (
    id               BIGSERIAL PRIMARY KEY,
    icon             VARCHAR(100),
    module           VARCHAR(100) NOT NULL,
    path             VARCHAR(255),
    parent_id        BIGINT REFERENCES system_menu(id) ON DELETE RESTRICT,
    tree_path        LTREE NOT NULL,
    sort_order       INTEGER NOT NULL DEFAULT 100,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    is_superadmin_only BOOLEAN NOT NULL DEFAULT FALSE,
    is_dialog        BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by       BIGINT REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_menu_tree_path ON system_menu USING GIST (tree_path);
CREATE UNIQUE INDEX uq_system_menu_tree_path ON system_menu (tree_path) WHERE deleted_at IS NULL;
CREATE INDEX idx_system_menu_parent_sort ON system_menu (parent_id, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE admin_role_language (
    admin_role_id BIGINT NOT NULL REFERENCES admin_role(id) ON DELETE CASCADE,
    locale        VARCHAR(10) NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_role_id, locale)
);

CREATE TABLE system_menu_language (
    system_menu_id BIGINT NOT NULL REFERENCES system_menu(id) ON DELETE CASCADE,
    locale         VARCHAR(10) NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT,
    name           VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (system_menu_id, locale)
);

CREATE TABLE system_menu_permission (
    system_menu_id       BIGINT NOT NULL REFERENCES system_menu(id) ON DELETE CASCADE,
    system_permission_id BIGINT NOT NULL REFERENCES system_permission(id) ON DELETE CASCADE,
    PRIMARY KEY (system_menu_id, system_permission_id)
);

CREATE TABLE admin_role_permission (
    admin_role_id        BIGINT NOT NULL REFERENCES admin_role(id) ON DELETE CASCADE,
    system_permission_id BIGINT NOT NULL REFERENCES system_permission(id) ON DELETE CASCADE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_role_id, system_permission_id)
);

CREATE TABLE admin_user_session (
    id                 BIGSERIAL PRIMARY KEY,
    admin_user_id      BIGINT NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    access_token_jti   VARCHAR(255),
    device_name        VARCHAR(255),
    device_id          VARCHAR(255),
    ip_address         VARCHAR(45),
    user_agent         TEXT,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at         TIMESTAMPTZ NOT NULL,
    last_used_at       TIMESTAMPTZ,
    revoked_at         TIMESTAMPTZ,
    revoked_reason     VARCHAR(255),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_user_session_user ON admin_user_session (admin_user_id);
CREATE INDEX idx_admin_user_session_active ON admin_user_session (admin_user_id) WHERE is_active = TRUE AND revoked_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS admin_user_session;
DROP TABLE IF EXISTS admin_role_permission;
DROP TABLE IF EXISTS system_menu_permission;
DROP TABLE IF EXISTS system_menu_language;
DROP TABLE IF EXISTS admin_role_language;
DROP TABLE IF EXISTS system_menu;
DROP TABLE IF EXISTS system_permission;
DROP TABLE IF EXISTS website_language;
DROP TABLE IF EXISTS admin_user;
DROP TABLE IF EXISTS admin_role;
DROP TYPE IF EXISTS system_permission_method;
DROP TYPE IF EXISTS system_permission_action;
DROP TYPE IF EXISTS admin_user_type;
DROP TYPE IF EXISTS admin_user_status;
DROP TYPE IF EXISTS member_user_type;
DROP TYPE IF EXISTS member_tier_relation_type;
DROP TYPE IF EXISTS claim_item_status;
DROP TYPE IF EXISTS claim_type;
DROP TYPE IF EXISTS discount_unit;
DROP TYPE IF EXISTS entity_branch;
DROP EXTENSION IF EXISTS ltree;
-- +goose StatementEnd
