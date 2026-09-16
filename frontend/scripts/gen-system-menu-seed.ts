/**
 * Regenerate backend init menu seed from admin-menu-mock.
 * From frontend/: bun scripts/gen-system-menu-seed.ts > ../backend/internal/infra/postgres/seeds/init/07_system_menu.sql
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInitialAdminMenuRows } from "../lib/admin-menu-mock";
import {
  resolveMenuPermKeys,
  shouldLinkMenuPermissions,
} from "../lib/menu-perm-resolve";
import { buildPermissionCatalog, PERM_ACTIONS } from "./lib/perm-catalog-seed";

const SEED_TS = "2026-01-01T00:00:00Z";

const { codeToId } = buildPermissionCatalog();

const ROOT_SLUG: Record<number, string> = {
  2: "system",
  11: "admin",
  14: "setting",
  22: "supplier",
  23: "location",
  25: "warehouse",
  28: "product",
  33: "member",
  37: "sales",
  45: "order",
};

const PATH_OVERRIDE_BY_ID: Record<number, string> = {
  3: "/admin/system/menu",
  4: "/admin/system/permission",
  5: "/admin/system/language",
  12: "/admin/admin/users",
  13: "/admin/admin/roles",
  22: "/admin/supplier",
  24: "/admin/location/locations",
  26: "/admin/warehouse/list",
  27: "/admin/warehouse/list/view",
  29: "/admin/product/list",
  35: "/admin/member/tiers",
  36: "/admin/member/users",
};

type Row = ReturnType<typeof createInitialAdminMenuRows>[number];

function labelToKebab(en: string): string {
  return en
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function leafSegment(module: string, parentModule: string | null): string {
  if (module.startsWith("website_")) {
    return module.slice("website_".length).replace(/_/g, "-");
  }
  if (parentModule && module.startsWith(`${parentModule}_`)) {
    return module.slice(parentModule.length + 1).replace(/_/g, "-");
  }
  return module.replace(/_/g, "-");
}

function isNavigableMockPath(path: string | null): path is string {
  return !!path && path !== "#" && path.startsWith("pages/");
}

function hasChildren(id: number, rows: Row[]): boolean {
  return rows.some((r) => r.parent_id === id);
}

function hierarchicalAdminPath(
  row: Row,
  rows: Row[],
  byId: Map<number, Row>
): string | null {
  if (hasChildren(row.id, rows)) return null;
  const override = PATH_OVERRIDE_BY_ID[row.id];
  if (override) return override;

  const chain: Row[] = [];
  let cur: Row | undefined = row;
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
  }

  const segments: string[] = [];
  for (let i = 0; i < chain.length; i++) {
    const node = chain[i];
    const isTarget = i === chain.length - 1;
    const parent = i > 0 ? chain[i - 1] : undefined;

    if (node.parent_id == null) {
      segments.push(ROOT_SLUG[node.id] ?? labelToKebab(node.labels.en));
    } else if (isTarget) {
      segments.push(leafSegment(node.module, parent?.module ?? null));
    } else if (!isNavigableMockPath(node.path)) {
      segments.push(labelToKebab(node.labels.en));
    } else {
      segments.push(leafSegment(node.module, parent?.module ?? null));
    }
  }
  return `/admin/${segments.join("/")}`;
}

function sqlStr(v: string | null): string {
  if (v === null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function sqlBool(v: boolean): string {
  return v ? "TRUE" : "FALSE";
}

function parseMenuFlags(): Map<
  number,
  { is_superadmin_only: boolean; is_dialog: boolean; icon: string | null }
> {
  const src = readFileSync(join(import.meta.dir, "../lib/admin-menu-mock.ts"), "utf8");
  const flags = new Map<
    number,
    { is_superadmin_only: boolean; is_dialog: boolean; icon: string | null }
  >();
  const blockRe = /\{\s*id:\s*(\d+),([\s\S]*?)\n\s*\},/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(src))) {
    const id = Number(m[1]);
    const body = m[2];
    flags.set(id, {
      is_superadmin_only: /is_superadmin_only:\s*true/.test(body),
      is_dialog: /is_dialog:\s*true/.test(body),
      icon: (() => {
        const im = /icon:\s*"([^"]+)"/.exec(body);
        return im ? im[1] : null;
      })(),
    });
  }
  return flags;
}

function permLinks(
  rows: Row[],
  flagMap: ReturnType<typeof parseMenuFlags>
) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: { menuId: number; permId: number }[] = [];

  for (const d of rows) {
    const flags = flagMap.get(d.id);
    if (
      !shouldLinkMenuPermissions(d, { isDialog: flags?.is_dialog })
    ) {
      continue;
    }

    const parent = d.parent_id != null ? byId.get(d.parent_id) : undefined;
    const { permModule, permType } = resolveMenuPermKeys(d, parent);

    for (const action of PERM_ACTIONS) {
      const code = `${permModule}.${permType}.${action}`;
      const permId = codeToId.get(code);
      if (permId != null) out.push({ menuId: d.id, permId });
    }
  }
  return out;
}

const flagMap = parseMenuFlags();
const rows = createInitialAdminMenuRows().sort((a, b) => a.id - b.id);
const byId = new Map(rows.map((r) => [r.id, r]));

for (const r of rows) {
  if (r.sort_order % 100 !== 0) {
    throw new Error(`sort_order must be multiple of 100: id ${r.id} = ${r.sort_order}`);
  }
}

const lines: string[] = [
  "-- Nav tree from frontend/lib/admin-menu-mock.ts (hierarchical /admin/{main}/{sub}/...)",
  "",
  "INSERT INTO system_menu (id, icon, module, path, parent_id, tree_path, sort_order, is_active, is_superadmin_only, is_dialog, created_at, updated_at)",
  "VALUES",
];

lines.push(
  ...rows.map((d, i) => {
    const f = flagMap.get(d.id) ?? {
      is_superadmin_only: false,
      is_dialog: false,
      icon: null,
    };
    const path = hierarchicalAdminPath(d, rows, byId);
    const parent = d.parent_id == null ? "NULL" : String(d.parent_id);
    const tail = i === rows.length - 1 ? "" : ",";
    return `  (${d.id}, ${sqlStr(f.icon)}, ${sqlStr(d.module)}, ${sqlStr(path)}, ${parent}, ${sqlStr(d.tree_path)}::ltree, ${d.sort_order}, TRUE, ${sqlBool(f.is_superadmin_only)}, ${sqlBool(f.is_dialog)}, '${SEED_TS}', '${SEED_TS}')${tail}`;
  })
);

lines.push(
  "ON CONFLICT (id) DO UPDATE SET",
  "  icon = EXCLUDED.icon,",
  "  module = EXCLUDED.module,",
  "  path = EXCLUDED.path,",
  "  parent_id = EXCLUDED.parent_id,",
  "  tree_path = EXCLUDED.tree_path,",
  "  sort_order = EXCLUDED.sort_order,",
  "  is_active = EXCLUDED.is_active,",
  "  is_superadmin_only = EXCLUDED.is_superadmin_only,",
  "  is_dialog = EXCLUDED.is_dialog,",
  "  updated_at = EXCLUDED.updated_at,",
  "  deleted_at = NULL;",
  "",
  "INSERT INTO system_menu_language (system_menu_id, locale, name, created_at, updated_at)",
  "VALUES"
);

const langRows: string[] = [];
for (const d of rows) {
  for (const loc of ["th", "en"] as const) {
    langRows.push(
      `  (${d.id}, '${loc}', ${sqlStr(d.labels[loc])}, '${SEED_TS}', '${SEED_TS}')`
    );
  }
}
lines.push(langRows.join(",\n"));
lines.push(
  "ON CONFLICT (system_menu_id, locale) DO UPDATE SET",
  "  name = EXCLUDED.name,",
  "  updated_at = EXCLUDED.updated_at;",
  ""
);

const links = permLinks(rows, flagMap);
if (links.length > 0) {
  lines.push(
    "INSERT INTO system_menu_permission (system_menu_id, system_permission_id)",
    "VALUES"
  );
  lines.push(
    links
      .map((l, i) => {
        const tail = i === links.length - 1 ? "" : ",";
        return `  (${l.menuId}, ${l.permId})${tail}`;
      })
      .join("\n")
  );
  lines.push("ON CONFLICT DO NOTHING;", "");
}

lines.push(
  "SELECT setval(pg_get_serial_sequence('system_menu', 'id'), GREATEST((SELECT MAX(id) FROM system_menu), 57));"
);

process.stdout.write(`${lines.join("\n")}\n`);
