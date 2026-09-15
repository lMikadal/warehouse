import type { TableIconActionKey } from "@/components/molecules/table-icon-actions";

export type PermissionAction = "view" | "create" | "update" | "delete";

export type ResourceActions = Record<PermissionAction, boolean>;

export function permissionCode(
  module: string,
  type: string,
  action: PermissionAction
): string {
  return `${module}.${type}.${action}`;
}

export function buildPermissionIndex(codes: string[]): Set<string> {
  return new Set(codes);
}

export function isSuperAdminUserType(userType: string): boolean {
  return userType === "superadmin";
}

export function canPermission(
  index: Set<string>,
  userType: string,
  module: string,
  type: string,
  action: PermissionAction
): boolean {
  if (isSuperAdminUserType(userType)) return true;
  return index.has(permissionCode(module, type, action));
}

export function resourceActions(
  index: Set<string>,
  userType: string,
  module: string,
  type: string
): ResourceActions {
  return {
    view: canPermission(index, userType, module, type, "view"),
    create: canPermission(index, userType, module, type, "create"),
    update: canPermission(index, userType, module, type, "update"),
    delete: canPermission(index, userType, module, type, "delete"),
  };
}

export function tableRowDetailAction(action: TableIconActionKey): boolean {
  return action === "edit" || action === "view";
}

export function tableIconActionsFromResource(
  actions: ResourceActions,
  opts?: { rowId?: number; editOnlyRowId?: number }
): TableIconActionKey[] {
  if (opts?.editOnlyRowId != null && opts.rowId === opts.editOnlyRowId) {
    if (actions.update) return ["edit"];
    if (actions.view) return ["view"];
    return [];
  }
  const out: TableIconActionKey[] = [];
  if (actions.update) out.push("edit");
  else if (actions.view) out.push("view");
  if (actions.delete) out.push("delete");
  return out;
}
