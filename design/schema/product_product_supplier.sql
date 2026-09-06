-- source: v1 product_products_supplier_suppliers (v2 had no equivalent — gap restored)
-- junction: which suppliers can supply this product
CREATE TABLE product_product_supplier (
    product_product_id   BIGINT NOT NULL REFERENCES product_product(id)   ON DELETE CASCADE, -- product
    supplier_supplier_id BIGINT NOT NULL REFERENCES supplier_supplier(id)  ON DELETE CASCADE, -- supplier who can supply it
    PRIMARY KEY (product_product_id, supplier_supplier_id)
);

CREATE INDEX idx_product_product_supplier_supplier ON product_product_supplier (supplier_supplier_id);
