/** Map system_menu row → RBAC module/type for seed junction (design sidebar rules). */

export type MenuPermRow = {
  id: number;
  parent_id?: number | null;
  module: string;
  path?: string | null;
};

export type MenuPermKeys = {
  permModule: string;
  permType: string;
};

export function resolveMenuPermKeys(
  menu: MenuPermRow,
  parent: MenuPermRow | undefined
): MenuPermKeys {
  let permModule = parent ? parent.module : menu.module;
  if (menu.parent_id === 2) {
    permModule = "admin";
  } else if (
    parent &&
    parent.parent_id === 2 &&
    parent.id === 6
  ) {
    permModule = "admin";
  }
  if (menu.parent_id === 11) permModule = "admin";
  if (menu.parent_id === 37) permModule = "order";
  if (
    parent &&
    (parent.id === 33 || parent.parent_id === 33)
  ) {
    permModule = "member";
  }
  if (menu.id === 22) permModule = "supplier";

  let permType = menu.module;
  if (menu.id === 22) permType = "supplier_user";

  switch (menu.module) {
    case "admin_menu":
      return { permModule: "system", permType: "system_menu" };
    case "admin_permission":
      return { permModule: "system", permType: "system_permission" };
    case "admin_user":
      return { permModule: "admin", permType: "admin_user" };
    case "admin_role":
      return { permModule: "admin", permType: "admin_role" };
    default:
      return { permModule, permType };
  }
}

export function shouldLinkMenuPermissions(
  menu: MenuPermRow,
  opts: { isDialog?: boolean }
): boolean {
  const rawPath = menu.path;
  if (!rawPath || opts.isDialog) return false;
  if (/dashboard\.html/i.test(rawPath)) return false;
  return true;
}
