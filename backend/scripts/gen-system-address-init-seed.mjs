#!/usr/bin/env node
/** Regenerate init/08_system_address_geo.sql from design/js/seed/system_*.js */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const seedDir = path.join(repoRoot, "design/js/seed");
const outPath = path.join(
  repoRoot,
  "backend/internal/infra/postgres/seeds/init/08_system_address_geo.sql"
);

const g = globalThis;
g.window = g;
function load(name) {
  const code = fs.readFileSync(path.join(seedDir, name), "utf8");
  // design seeds are IIFEs on globalThis
  eval(code);
}

load("_admin_shared.js");
for (const f of [
  "system_country.js",
  "system_country_language.js",
  "system_province.js",
  "system_province_language.js",
  "system_district.js",
  "system_district_language.js",
  "system_sub_district.js",
  "system_sub_district_language.js",
]) {
  load(f);
}

const TS = "2026-01-01T00:00:00Z";
const esc = (s) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

function insertCountry() {
  const rows = g.SEED_SYSTEM_COUNTRY;
  const vals = rows
    .map(
      (r) =>
        `(${r.id}, ${esc(r.sku)}, ${r.sort_order}, ${r.is_active}, NULL, '${TS}', '${TS}', 1, 1)`
    )
    .join(",\n  ");
  return `INSERT INTO system_country (id, sku, sort_order, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  ${vals}
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;

SELECT setval(pg_get_serial_sequence('system_country', 'id'), (SELECT COALESCE(MAX(id), 1) FROM system_country));
`;
}

function insertLang(table, fk, data) {
  const vals = data
    .map(
      (r) =>
        `(${r[fk]}, ${esc(r.locale)}, ${esc(r.name)}, '${TS}', '${TS}')`
    )
    .join(",\n  ");
  return `INSERT INTO ${table} (${fk}, locale, name, created_at, updated_at)
VALUES
  ${vals}
ON CONFLICT (${fk}, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at;
`;
}

function insertProvince() {
  const rows = g.SEED_SYSTEM_PROVINCE;
  const vals = rows
    .map(
      (r) =>
        `(${r.id}, ${r.system_country_id}, ${esc(r.sku)}, ${r.sort_order}, ${r.is_active}, NULL, '${TS}', '${TS}', 1, 1)`
    )
    .join(",\n  ");
  return `INSERT INTO system_province (id, system_country_id, sku, sort_order, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  ${vals}
ON CONFLICT (id) DO UPDATE SET
  system_country_id = EXCLUDED.system_country_id, sku = EXCLUDED.sku, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;

SELECT setval(pg_get_serial_sequence('system_province', 'id'), (SELECT COALESCE(MAX(id), 1) FROM system_province));
`;
}

function insertDistrict() {
  const rows = g.SEED_SYSTEM_DISTRICT;
  const vals = rows
    .map(
      (r) =>
        `(${r.id}, ${r.system_province_id}, ${esc(r.sku)}, ${r.sort_order}, ${r.is_active}, NULL, '${TS}', '${TS}', 1, 1)`
    )
    .join(",\n  ");
  return `INSERT INTO system_district (id, system_province_id, sku, sort_order, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  ${vals}
ON CONFLICT (id) DO UPDATE SET
  system_province_id = EXCLUDED.system_province_id, sku = EXCLUDED.sku, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;

SELECT setval(pg_get_serial_sequence('system_district', 'id'), (SELECT COALESCE(MAX(id), 1) FROM system_district));
`;
}

function insertSubDistrict() {
  const rows = g.SEED_SYSTEM_SUB_DISTRICT;
  const vals = rows
    .map(
      (r) =>
        `(${r.id}, ${r.system_district_id}, ${esc(r.sku)}, ${esc(r.postcode)}, ${r.sort_order}, ${r.is_active}, NULL, '${TS}', '${TS}', 1, 1)`
    )
    .join(",\n  ");
  return `INSERT INTO system_sub_district (id, system_district_id, sku, postcode, sort_order, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  ${vals}
ON CONFLICT (id) DO UPDATE SET
  system_district_id = EXCLUDED.system_district_id, sku = EXCLUDED.sku, postcode = EXCLUDED.postcode,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;

SELECT setval(pg_get_serial_sequence('system_sub_district', 'id'), (SELECT COALESCE(MAX(id), 1) FROM system_sub_district));
`;
}

const out = `-- Geo address baseline — mirrors design/js/seed/system_* (TH + SG demo chain)
-- Requires: 01_system_language.sql, admin_user id=1, migration system_address_geo
-- Regenerate: node backend/scripts/gen-system-address-init-seed.mjs

${insertCountry()}
${insertLang("system_country_language", "system_country_id", g.SEED_SYSTEM_COUNTRY_LANGUAGE)}
${insertProvince()}
${insertLang("system_province_language", "system_province_id", g.SEED_SYSTEM_PROVINCE_LANGUAGE)}
${insertDistrict()}
${insertLang("system_district_language", "system_district_id", g.SEED_SYSTEM_DISTRICT_LANGUAGE)}
${insertSubDistrict()}
${insertLang("system_sub_district_language", "system_sub_district_id", g.SEED_SYSTEM_SUB_DISTRICT_LANGUAGE)}
`;

fs.writeFileSync(outPath, out);
console.log("Wrote", outPath);
