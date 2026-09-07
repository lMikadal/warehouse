-- source: v1 product_products_supplier_suppliers (v2 had no equivalent — gap restored)
-- junction: which suppliers can supply this product
CREATE TABLE product_list_supplier (
    product_list_id   BIGINT NOT NULL REFERENCES product_list(id)   ON DELETE CASCADE, -- product
    supplier_user_id  BIGINT NOT NULL REFERENCES supplier_user(id)  ON DELETE CASCADE, -- supplier who can supply it
    PRIMARY KEY (product_list_id, supplier_user_id)
);

CREATE INDEX idx_product_list_supplier_supplier ON product_list_supplier (supplier_user_id);
