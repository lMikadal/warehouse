/**
 * Init seed for system_permission ids >= 25 (wave 1 stays in 02–05).
 * From frontend/: bun scripts/gen-system-permission-seed.ts > ../backend/internal/infra/postgres/seeds/init/06_system_permission_catalog.sql
 */
import { catalogRowsFromId } from "../lib/perm-catalog";

const MIN_ID = 25;
const rows = catalogRowsFromId(MIN_ID);

function sqlStr(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

const lines: string[] = [
  "-- Full permission catalog (design PERM_PAGES) — ids >= 25; wave 1 in 02–05",
  "",
  "INSERT INTO system_permission (id, code, module, type, action, resource, method, is_active)",
  "VALUES",
];

lines.push(
  rows
    .map((r, i) => {
      const tail = i === rows.length - 1 ? "" : ",";
      return `  (${r.id}, ${sqlStr(r.code)}, ${sqlStr(r.module)}, ${sqlStr(r.type)}, ${sqlStr(r.action)}, ${sqlStr(r.resource)}, ${sqlStr(r.method)}, ${r.is_active ? "TRUE" : "FALSE"})${tail}`;
    })
    .join("\n")
);

lines.push(
  "ON CONFLICT (code) DO UPDATE SET",
  "  module = EXCLUDED.module,",
  "  type = EXCLUDED.type,",
  "  action = EXCLUDED.action,",
  "  resource = EXCLUDED.resource,",
  "  method = EXCLUDED.method,",
  "  is_active = EXCLUDED.is_active,",
  "  updated_at = CURRENT_TIMESTAMP;",
  "",
  `SELECT setval(pg_get_serial_sequence('system_permission', 'id'), GREATEST((SELECT MAX(id) FROM system_permission), ${rows[rows.length - 1]?.id ?? MIN_ID}));`,
  ""
);

process.stdout.write(`${lines.join("\n")}\n`);
