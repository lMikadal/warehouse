#!/usr/bin/env node
/**
 * Generates dev SQL from design/js/seed/*.js — run from repo root:
 *   node backend/scripts/gen-warehouse-product-dev-seed.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const seedDir = path.join(root, "design/js/seed");
const outDir = path.join(
  root,
  "backend/internal/infra/postgres/seeds/dev"
);

const TS = "2026-01-01T00:00:00Z";

function loadSeed(filename) {
  const ctx = { window: {} };
  if (!global.window) global.window = ctx.window;
  vm.runInNewContext(
    fs.readFileSync(path.join(seedDir, "_admin_shared.js"), "utf8"),
    ctx
  );
  vm.runInNewContext(
    fs.readFileSync(path.join(seedDir, filename), "utf8"),
    ctx
  );
  return ctx.window;
}

function sqlStr(s) {
  if (s == null) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlBool(b) {
  return b ? "TRUE" : "FALSE";
}

const whCtx = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(seedDir, "_admin_shared.js"), "utf8"),
  whCtx
);
for (const f of [
  "warehouse_list.js",
  "warehouse_list_language.js",
  "warehouse_condition.js",
]) {
  vm.runInNewContext(fs.readFileSync(path.join(seedDir, f), "utf8"), whCtx);
}
const whLang = whCtx.window.SEED_WAREHOUSE_LIST_LANGUAGE;
const whCond = whCtx.window.SEED_WAREHOUSE_CONDITION;
const whList = whCtx.window.SEED_WAREHOUSE_LIST;

let whSql = `-- Dev warehouse demo — generated from design/js/seed/warehouse_*.js
-- Requires: migration 20260918130000_warehouse_module.sql

INSERT INTO warehouse_list (id, type, sku, parent_id, tree_path, sort_order, capacity, is_active, created_by, updated_by, created_at, updated_at)
VALUES
`;
whSql += whList
  .map(
    (r) =>
      `  (${r.id}, ${sqlStr(r.type)}, ${sqlStr(r.sku)}, ${r.parent_id ?? "NULL"}, ${sqlStr(r.tree_path)}::ltree, ${r.sort_order}, ${r.capacity}, ${sqlBool(r.is_active)}, 1, 1, ${sqlStr(TS)}, ${sqlStr(TS)})`
  )
  .join(",\n");
whSql += `
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  sku = EXCLUDED.sku,
  parent_id = EXCLUDED.parent_id,
  tree_path = EXCLUDED.tree_path,
  sort_order = EXCLUDED.sort_order,
  capacity = EXCLUDED.capacity,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO warehouse_list_language (warehouse_list_id, locale, name, created_at, updated_at)
VALUES
`;
whSql += whLang
  .map(
    (r) =>
      `  (${r.warehouse_list_id}, ${sqlStr(r.locale)}, ${sqlStr(r.name)}, ${sqlStr(TS)}, ${sqlStr(TS)})`
  )
  .join(",\n");
whSql += `
ON CONFLICT (warehouse_list_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

INSERT INTO warehouse_condition (warehouse_list_id, type, amount, amount_active)
VALUES
`;
whSql += whCond
  .map(
    (r) =>
      `  (${r.warehouse_list_id}, ${sqlStr(r.type)}, ${r.amount}, ${r.amount_active})`
  )
  .join(",\n");
whSql += `
ON CONFLICT (warehouse_list_id, type) DO UPDATE SET
  amount = EXCLUDED.amount,
  amount_active = EXCLUDED.amount_active;

SELECT setval(pg_get_serial_sequence('warehouse_list', 'id'), GREATEST((SELECT MAX(id) FROM warehouse_list), 1));
`;

// Product seeds
const files = [
  "product_attribute.js",
  "product_list.js",
  "product_list_language.js",
  "product_item.js",
  "product_item_warehouse.js",
  "product_item_stock.js",
];
const pw = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(seedDir, "_admin_shared.js"), "utf8"),
  pw
);
for (const f of files) {
  vm.runInNewContext(fs.readFileSync(path.join(seedDir, f), "utf8"), pw);
}
// attribute language in same file as attribute
vm.runInNewContext(
  fs.readFileSync(path.join(seedDir, "product_attribute.js"), "utf8"),
  pw
);

const attr = pw.window.SEED_PRODUCT_ATTRIBUTE;
const attrLang = pw.window.SEED_PRODUCT_ATTRIBUTE_LANGUAGE;
const pl = pw.window.SEED_PRODUCT_LIST;
const plLang = pw.window.SEED_PRODUCT_LIST_LANGUAGE;
const pi = pw.window.SEED_PRODUCT_ITEM;
const piw = pw.window.SEED_PRODUCT_ITEM_WAREHOUSE;
const pis = pw.window.SEED_PRODUCT_ITEM_STOCK;

let prodSql = `-- Dev product demo — generated from design/js/seed/product_*.js
-- Requires: migrations 20260918140000_product_module.sql, warehouse dev seed (bins)

INSERT INTO product_attribute (id, type, type_car, system_file_id, parent_id, tree_path, sort_order, is_active, is_stopped, created_by, updated_by, created_at, updated_at)
VALUES
`;
prodSql += attr
  .map(
    (r) =>
      `  (${r.id}, ${sqlStr(r.type)}, ${r.type_car ? sqlStr(r.type_car) : "NULL"}, NULL, ${r.parent_id ?? "NULL"}, ${sqlStr(r.tree_path)}::ltree, ${r.sort_order}, ${sqlBool(r.is_active)}, ${sqlBool(r.is_stopped)}, 1, 1, ${sqlStr(TS)}, ${sqlStr(TS)})`
  )
  .join(",\n");
prodSql += `
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  type_car = EXCLUDED.type_car,
  parent_id = EXCLUDED.parent_id,
  tree_path = EXCLUDED.tree_path,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  is_stopped = EXCLUDED.is_stopped,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_attribute_language (product_attribute_id, locale, name, created_at, updated_at)
VALUES
`;
prodSql += attrLang
  .map(
    (r) =>
      `  (${r.product_attribute_id}, ${sqlStr(r.locale)}, ${sqlStr(r.name)}, ${sqlStr(TS)}, ${sqlStr(TS)})`
  )
  .join(",\n");
prodSql += `
ON CONFLICT (product_attribute_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_list (id, sku, product_brand_id, product_category_id, tag, supplier_sku, note, is_new, is_active, created_by, updated_by, created_at, updated_at)
VALUES
`;
prodSql += pl
  .map(
    (r) =>
      `  (${r.id}, ${sqlStr(r.sku)}, ${r.product_brand_id}, ${r.product_category_id}, ${sqlStr(r.tag)}, ${sqlStr(r.supplier_sku)}, ${sqlStr(r.note)}, ${sqlBool(r.is_new)}, ${sqlBool(r.is_active)}, 1, 1, ${sqlStr(TS)}, ${sqlStr(TS)})`
  )
  .join(",\n");
prodSql += `
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku,
  product_brand_id = EXCLUDED.product_brand_id,
  product_category_id = EXCLUDED.product_category_id,
  tag = EXCLUDED.tag,
  supplier_sku = EXCLUDED.supplier_sku,
  note = EXCLUDED.note,
  is_new = EXCLUDED.is_new,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_list_language (product_list_id, locale, name, sub_name, created_at, updated_at)
VALUES
`;
prodSql += plLang
  .map(
    (r) =>
      `  (${r.product_list_id}, ${sqlStr(r.locale)}, ${sqlStr(r.name)}, ${sqlStr(r.sub_name || "")}, ${sqlStr(TS)}, ${sqlStr(TS)})`
  )
  .join(",\n");
prodSql += `
ON CONFLICT (product_list_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  sub_name = EXCLUDED.sub_name,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_item (id, product_list_id, sku, barcode, qrcode, price, price_wholesale, vat_rate, promotion, type_price, unit, qty_per_unit, weight, width, length, height, minimum_stock, is_stopped, is_authentic, is_active, created_by, updated_by, created_at, updated_at)
VALUES
`;
prodSql += pi
  .map(
    (r) =>
      `  (${r.id}, ${r.product_list_id}, ${sqlStr(r.sku)}, ${sqlStr(r.barcode)}, ${sqlStr(r.qrcode)}, ${r.price ?? 0}, ${r.price_wholesale ?? 0}, ${r.vat_rate ?? 0}, ${sqlStr(r.promotion || "")}, ${sqlStr(r.type_price || "manual")}, ${sqlStr(r.unit || "piece")}, ${r.qty_per_unit ?? 1}, ${r.weight ?? "NULL"}, ${r.width ?? "NULL"}, ${r.length ?? "NULL"}, ${r.height ?? "NULL"}, ${r.minimum_stock ?? 0}, ${sqlBool(r.is_stopped)}, ${sqlBool(r.is_authentic ?? (r.is_fake != null ? !r.is_fake : true))}, ${sqlBool(r.is_active)}, 1, 1, ${sqlStr(TS)}, ${sqlStr(TS)})`
  )
  .join(",\n");
prodSql += `
ON CONFLICT (id) DO UPDATE SET
  product_list_id = EXCLUDED.product_list_id,
  sku = EXCLUDED.sku,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_item_warehouse (id, product_item_id, bin_id, created_by, updated_by, created_at, updated_at)
VALUES
`;
prodSql += piw
  .map(
    (r) =>
      `  (${r.id}, ${r.product_item_id}, ${r.bin_id}, 1, 1, ${sqlStr(TS)}, ${sqlStr(TS)})`
  )
  .join(",\n");
prodSql += `
ON CONFLICT (id) DO UPDATE SET
  product_item_id = EXCLUDED.product_item_id,
  bin_id = EXCLUDED.bin_id,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_item_stock (id, product_item_id, product_item_warehouse_id, purchase_order_item_id, order_quantity, order_free_gift, quantity, remain_quantity, cost_per_unit, discount_per_unit, vat_type, vat_rate, sell_price, is_used, received_at, created_by, updated_by, created_at, updated_at)
VALUES
`;
prodSql += pis
  .map((r) => {
    const po = r.purchase_order_item_id ?? "NULL";
    const oq = r.order_quantity ?? 0;
    const ofg = r.order_free_gift ?? 0;
    const qty = r.quantity ?? r.remain_quantity ?? 0;
    const rq = r.remain_quantity ?? 0;
    const cpu = r.cost_per_unit ?? 0;
    const dpu = r.discount_per_unit ?? 0;
    const vt = sqlStr(r.vat_type === "include" ? "include" : "exclude");
    const vr = r.vat_rate ?? 7;
    const sp = r.sell_price ?? 0;
    const recv = r.received_at ? sqlStr(r.received_at) : "NULL";
    return `  (${r.id}, ${r.product_item_id}, ${r.product_item_warehouse_id}, ${po}, ${oq}, ${ofg}, ${qty}, ${rq}, ${cpu}, ${dpu}, ${vt}, ${vr}, ${sp}, ${sqlBool(r.is_used)}, ${recv}, 1, 1, ${sqlStr(TS)}, ${sqlStr(TS)})`;
  })
  .join(",\n");
prodSql += `
ON CONFLICT (id) DO UPDATE SET
  remain_quantity = EXCLUDED.remain_quantity,
  vat_type = EXCLUDED.vat_type,
  vat_rate = EXCLUDED.vat_rate,
  is_used = EXCLUDED.is_used,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('product_attribute', 'id'), GREATEST((SELECT MAX(id) FROM product_attribute), 1));
SELECT setval(pg_get_serial_sequence('product_list', 'id'), GREATEST((SELECT MAX(id) FROM product_list), 1));
SELECT setval(pg_get_serial_sequence('product_item', 'id'), GREATEST((SELECT MAX(id) FROM product_item), 1));
SELECT setval(pg_get_serial_sequence('product_item_warehouse', 'id'), GREATEST((SELECT MAX(id) FROM product_item_warehouse), 1));
SELECT setval(pg_get_serial_sequence('product_item_stock', 'id'), GREATEST((SELECT MAX(id) FROM product_item_stock), 1));
`;

fs.writeFileSync(path.join(outDir, "13_warehouse_list.sql"), whSql);
fs.writeFileSync(path.join(outDir, "14_product_demo.sql"), prodSql);
console.log("Wrote 13_warehouse_list.sql and 14_product_demo.sql");
