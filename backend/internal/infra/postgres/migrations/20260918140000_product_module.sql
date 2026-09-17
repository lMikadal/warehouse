-- +goose Up
-- +goose StatementBegin
-- source: design/schema/product_*.sql (purchase_order_item_id without FK until PO module exists)

CREATE TYPE product_attribute_type     AS ENUM ('brand', 'category', 'car');
CREATE TYPE product_attribute_car_type AS ENUM ('brand', 'model', 'engine');

CREATE TABLE product_attribute (
    id             BIGSERIAL                   PRIMARY KEY,
    type           product_attribute_type      NOT NULL,
    type_car       product_attribute_car_type,
    system_file_id BIGINT                      REFERENCES system_file(id) ON DELETE RESTRICT,
    parent_id      BIGINT                      REFERENCES product_attribute(id) ON DELETE RESTRICT,
    tree_path      LTREE                       NOT NULL,
    sort_order     INTEGER                     NOT NULL DEFAULT 0,
    is_active      BOOLEAN                     NOT NULL DEFAULT TRUE,
    is_stopped     BOOLEAN                     NOT NULL DEFAULT FALSE,
    deleted_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     BIGINT                      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by     BIGINT                      REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_product_attribute_type_car
        CHECK (type_car IS NULL OR type = 'car')
);

CREATE INDEX idx_product_attribute_tree_path ON product_attribute USING GIST (tree_path);
CREATE UNIQUE INDEX uq_product_attribute_tree_path
    ON product_attribute (tree_path)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_product_attribute_parent_sort
    ON product_attribute (parent_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_product_attribute_type_active
    ON product_attribute (type, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_product_attribute_file       ON product_attribute (system_file_id) WHERE system_file_id IS NOT NULL;
CREATE INDEX idx_product_attribute_created_by ON product_attribute (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_attribute_updated_by ON product_attribute (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE product_attribute_language (
    product_attribute_id  BIGINT       NOT NULL REFERENCES product_attribute(id) ON DELETE CASCADE,
    locale                VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name                  VARCHAR(255) NOT NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_attribute_id, locale),
    CONSTRAINT uq_product_attribute_language_locale UNIQUE (product_attribute_id, locale)
);

CREATE INDEX idx_product_attribute_language_locale ON product_attribute_language (locale);

CREATE TABLE product_attribute_relation (
    product_attribute_id  BIGINT NOT NULL REFERENCES product_attribute(id) ON DELETE CASCADE,
    related_id            BIGINT NOT NULL REFERENCES product_attribute(id) ON DELETE CASCADE,
    PRIMARY KEY (product_attribute_id, related_id)
);

CREATE INDEX idx_product_attribute_relation_related ON product_attribute_relation (related_id);

CREATE TABLE product_list (
    id                   BIGSERIAL    PRIMARY KEY,
    sku                  TEXT         NOT NULL,
    product_brand_id     BIGINT       REFERENCES product_attribute(id) ON DELETE SET NULL,
    product_category_id  BIGINT       REFERENCES product_attribute(id) ON DELETE SET NULL,
    tag                  TEXT         NOT NULL DEFAULT '',
    supplier_sku         TEXT         NOT NULL DEFAULT '',
    note                 TEXT         NOT NULL DEFAULT '',
    is_new               BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_list_sku    ON product_list (sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_list_brand        ON product_list (product_brand_id)    WHERE product_brand_id IS NOT NULL;
CREATE INDEX idx_product_list_category     ON product_list (product_category_id) WHERE product_category_id IS NOT NULL;
CREATE INDEX idx_product_list_created_by   ON product_list (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_list_updated_by   ON product_list (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE product_list_language (
    product_list_id  BIGINT       NOT NULL REFERENCES product_list(id) ON DELETE CASCADE,
    locale           VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name             VARCHAR(255) NOT NULL,
    sub_name         VARCHAR(255),
    description      TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_list_id, locale),
    CONSTRAINT uq_product_list_language_locale UNIQUE (product_list_id, locale)
);

CREATE INDEX idx_product_list_language_locale ON product_list_language (locale);

CREATE TYPE product_list_code_type AS ENUM ('factory', 'other');

CREATE TABLE product_list_code (
    id               BIGSERIAL                   PRIMARY KEY,
    product_list_id  BIGINT                      NOT NULL REFERENCES product_list(id) ON DELETE CASCADE,
    code_type        product_list_code_type      NOT NULL,
    sku              VARCHAR(255)                NOT NULL,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT                      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by       BIGINT                      REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_list_code_product ON product_list_code (product_list_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_list_code_sku     ON product_list_code (sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_list_code_created_by ON product_list_code (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_list_code_updated_by ON product_list_code (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE product_list_supplier (
    product_list_id   BIGINT NOT NULL REFERENCES product_list(id)   ON DELETE CASCADE,
    supplier_user_id  BIGINT NOT NULL REFERENCES supplier_user(id)  ON DELETE CASCADE,
    PRIMARY KEY (product_list_id, supplier_user_id)
);

CREATE INDEX idx_product_list_supplier_supplier ON product_list_supplier (supplier_user_id);

CREATE TYPE product_list_car_gear_type AS ENUM ('auto', 'manual', 'cvt', 'dct', 'other');

CREATE TABLE product_list_car (
    id                          BIGSERIAL             PRIMARY KEY,
    product_list_id             BIGINT                NOT NULL REFERENCES product_list(id) ON DELETE CASCADE,
    product_attribute_brand_id  BIGINT                REFERENCES product_attribute(id) ON DELETE RESTRICT,
    product_attribute_model_id  BIGINT                REFERENCES product_attribute(id) ON DELETE RESTRICT,
    product_attribute_engine_id BIGINT                NOT NULL REFERENCES product_attribute(id) ON DELETE RESTRICT,
    gear_type                   product_list_car_gear_type,
    year_start                  SMALLINT,
    year_end                    SMALLINT,
    deleted_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                  BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_list_car_product  ON product_list_car (product_list_id)          WHERE deleted_at IS NULL;
CREATE INDEX idx_product_list_car_brand    ON product_list_car (product_attribute_brand_id)  WHERE product_attribute_brand_id IS NOT NULL;
CREATE INDEX idx_product_list_car_model    ON product_list_car (product_attribute_model_id)  WHERE product_attribute_model_id IS NOT NULL;
CREATE INDEX idx_product_list_car_engine   ON product_list_car (product_attribute_engine_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_list_car_created_by ON product_list_car (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_list_car_updated_by ON product_list_car (updated_by) WHERE updated_by IS NOT NULL;

CREATE TYPE product_unit            AS ENUM ('piece', 'box', 'set', 'roll', 'pair', 'bag', 'sheet', 'meter', 'liter', 'kg');
CREATE TYPE product_item_type_price AS ENUM ('manual', 'stock');

CREATE TABLE product_item (
    id                    BIGSERIAL               PRIMARY KEY,
    product_list_id       BIGINT                  NOT NULL REFERENCES product_list(id) ON DELETE RESTRICT,
    sku                   VARCHAR(255),
    barcode               VARCHAR(255),
    qrcode                VARCHAR(255),
    price                 NUMERIC(15,4)           NOT NULL DEFAULT 0,
    price_wholesale       NUMERIC(15,4)           NOT NULL DEFAULT 0,
    vat_rate              NUMERIC(5,2)            NOT NULL DEFAULT 0,
    promotion             TEXT                    NOT NULL DEFAULT '',
    type_price            product_item_type_price NOT NULL DEFAULT 'manual',
    unit                  product_unit            NOT NULL DEFAULT 'piece',
    qty_per_unit          INTEGER                 NOT NULL DEFAULT 1,
    weight                NUMERIC(15,4),
    width                 NUMERIC(15,4),
    length                NUMERIC(15,4),
    height                NUMERIC(15,4),
    minimum_stock         INTEGER                 NOT NULL DEFAULT 0,
    new_product_item_id   BIGINT                  REFERENCES product_item(id) ON DELETE SET NULL,
    is_stopped            BOOLEAN                 NOT NULL DEFAULT FALSE,
    is_fake               BOOLEAN                 NOT NULL DEFAULT FALSE,
    is_active             BOOLEAN                 NOT NULL DEFAULT TRUE,
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by            BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_item_sku         ON product_item (sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_product_item_product           ON product_item (product_list_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_new_item          ON product_item (new_product_item_id) WHERE new_product_item_id IS NOT NULL;
CREATE INDEX idx_product_item_stopped           ON product_item (is_stopped) WHERE is_stopped = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_product_item_created_by        ON product_item (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_updated_by        ON product_item (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE product_item_language (
    product_item_id  BIGINT       NOT NULL REFERENCES product_item(id) ON DELETE CASCADE,
    locale           VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_item_id, locale),
    CONSTRAINT uq_product_item_language_locale UNIQUE (product_item_id, locale)
);

CREATE INDEX idx_product_item_language_locale ON product_item_language (locale);

CREATE TABLE product_item_file (
    id                BIGSERIAL    PRIMARY KEY,
    product_item_id   BIGINT       NOT NULL REFERENCES product_item(id) ON DELETE CASCADE,
    system_file_id   BIGINT       NOT NULL REFERENCES system_file(id)   ON DELETE RESTRICT,
    sort_order        INTEGER      NOT NULL DEFAULT 0,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_item_file_item_file
    ON product_item_file (product_item_id, system_file_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_product_item_file_item_sort
    ON product_item_file (product_item_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_product_item_file_file
    ON product_item_file (system_file_id);

CREATE INDEX idx_product_item_file_created_by
    ON product_item_file (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX idx_product_item_file_updated_by
    ON product_item_file (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE product_item_price (
    product_item_id          BIGINT        NOT NULL REFERENCES product_item(id)          ON DELETE CASCADE,
    setting_sale_channel_id  BIGINT        NOT NULL REFERENCES setting_sale_channel(id)  ON DELETE RESTRICT,
    price                    NUMERIC(15,4) NOT NULL DEFAULT 0,
    vat_rate                 NUMERIC(5,2)  NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_item_id, setting_sale_channel_id)
);

CREATE INDEX idx_product_item_price_channel ON product_item_price (setting_sale_channel_id);

CREATE TABLE product_item_supplier (
    id                   BIGSERIAL                             PRIMARY KEY,
    product_item_id      BIGINT        NOT NULL REFERENCES product_item(id)       ON DELETE CASCADE,
    supplier_user_id     BIGINT        NOT NULL REFERENCES supplier_user(id)  ON DELETE RESTRICT,
    cost_price           NUMERIC(15,4) NOT NULL DEFAULT 0,
    vat_rate             NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount             NUMERIC(15,4) NOT NULL DEFAULT 0,
    discount_type        discount_unit NOT NULL DEFAULT 'baht',
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_item_supplier_item_supplier
    ON product_item_supplier (product_item_id, supplier_user_id);

CREATE INDEX idx_product_item_supplier_item       ON product_item_supplier (product_item_id);
CREATE INDEX idx_product_item_supplier_supplier   ON product_item_supplier (supplier_user_id);
CREATE INDEX idx_product_item_supplier_created_by ON product_item_supplier (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_supplier_updated_by ON product_item_supplier (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE product_item_stop_log (
    id               BIGSERIAL    PRIMARY KEY,
    product_item_id  BIGINT       NOT NULL REFERENCES product_item(id) ON DELETE CASCADE,
    is_stopped       BOOLEAN      NOT NULL,
    note             TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_item_stop_log_item ON product_item_stop_log (product_item_id, created_at DESC);

CREATE TABLE product_item_warehouse (
    id                BIGSERIAL    PRIMARY KEY,
    product_item_id   BIGINT       NOT NULL REFERENCES product_item(id)       ON DELETE CASCADE,
    bin_id            BIGINT       NOT NULL REFERENCES warehouse_list(id) ON DELETE RESTRICT,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_item_warehouse_item       ON product_item_warehouse (product_item_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_product_item_warehouse_bin_unique ON product_item_warehouse (bin_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_warehouse_created_by ON product_item_warehouse (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_warehouse_updated_by ON product_item_warehouse (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE product_item_stock (
    id                      BIGSERIAL     PRIMARY KEY,
    product_item_id         BIGINT        NOT NULL REFERENCES product_item(id)              ON DELETE RESTRICT,
    product_item_warehouse_id BIGINT      NOT NULL REFERENCES product_item_warehouse(id)   ON DELETE RESTRICT,
    purchase_order_item_id  BIGINT,
    supplier_user_id        BIGINT        REFERENCES supplier_user(id)                   ON DELETE SET NULL,
    order_quantity          NUMERIC(15,4) NOT NULL DEFAULT 0,
    order_free_gift         NUMERIC(15,4) NOT NULL DEFAULT 0,
    quantity                NUMERIC(15,4) NOT NULL DEFAULT 0,
    remain_quantity         NUMERIC(15,4) NOT NULL DEFAULT 0,
    cost_per_unit           NUMERIC(15,4) NOT NULL DEFAULT 0,
    discount_per_unit       NUMERIC(15,4) NOT NULL DEFAULT 0,
    vat_rate                NUMERIC(5,2)  NOT NULL DEFAULT 0,
    sell_price              NUMERIC(15,4) NOT NULL DEFAULT 0,
    is_used                 BOOLEAN       NOT NULL DEFAULT FALSE,
    received_at             TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by              BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_item_stock_active
    ON product_item_stock (product_item_id, product_item_warehouse_id)
    WHERE is_used = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_product_item_stock_item        ON product_item_stock (product_item_id)              WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_stock_placement   ON product_item_stock (product_item_warehouse_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_stock_po_item     ON product_item_stock (purchase_order_item_id) WHERE purchase_order_item_id IS NOT NULL;
CREATE INDEX idx_product_item_stock_supplier    ON product_item_stock (supplier_user_id) WHERE supplier_user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_product_item_stock_created_by  ON product_item_stock (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_stock_updated_by  ON product_item_stock (updated_by) WHERE updated_by IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS product_item_stock, product_item_warehouse, product_item_stop_log,
  product_item_supplier, product_item_price, product_item_file, product_item_language,
  product_item, product_list_car, product_list_supplier, product_list_code,
  product_list_language, product_list, product_attribute_relation,
  product_attribute_language, product_attribute CASCADE;
DROP TYPE IF EXISTS product_item_type_price, product_unit, product_list_car_gear_type,
  product_list_code_type, product_attribute_car_type, product_attribute_type;
-- +goose StatementEnd
