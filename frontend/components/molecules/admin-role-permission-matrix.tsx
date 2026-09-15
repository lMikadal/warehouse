"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PermissionMatrixGroup } from "@/lib/admin-role-permission-matrix-api";
import {
  permissionActionLabel,
  type PermissionActionKey,
} from "@/lib/system-permission-api";
import { cn } from "@/lib/utils";

const MATRIX_ACTIONS: PermissionActionKey[] = [
  "view",
  "create",
  "update",
  "delete",
  "import",
  "export",
];

export type AdminRolePermissionMatrixProps = {
  groups: PermissionMatrixGroup[];
  value: number[];
  onChange: (ids: number[]) => void;
  locked?: boolean;
  className?: string;
};

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

export function AdminRolePermissionMatrix({
  groups,
  value,
  onChange,
  locked = false,
  className,
}: AdminRolePermissionMatrixProps) {
  const tRolePerm = useTranslations("rolePerm");
  const tAction = useTranslations("action");
  const tSearch = useTranslations("search");

  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const setSelected = useCallback(
    (next: Set<number>) => {
      if (locked) return;
      onChange([...next]);
    },
    [locked, onChange]
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter(
          (row) =>
            row.label.toLowerCase().includes(q) ||
            g.root_label.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.rows.length > 0);
  }, [groups, search]);

  const togglePerm = useCallback(
    (
      rowPerms: Record<string, number>,
      action: PermissionActionKey,
      checked: boolean
    ) => {
      const next = new Set(selected);
      const permId = rowPerms[action];
      if (!permId) return;

      if (checked) {
        next.add(permId);
        if (action !== "view") {
          const viewId = rowPerms.view;
          if (viewId) next.add(viewId);
        }
      } else {
        if (action === "view") {
          for (const a of MATRIX_ACTIONS) {
            if (a === "view") continue;
            const id = rowPerms[a];
            if (id && next.has(id)) return;
          }
        }
        next.delete(permId);
      }
      if (!setsEqual(next, selected)) setSelected(next);
    },
    [selected, setSelected]
  );

  const setRowAll = useCallback(
    (rowPerms: Record<string, number>, checked: boolean) => {
      const next = new Set(selected);
      for (const action of MATRIX_ACTIONS) {
        const id = rowPerms[action];
        if (!id) continue;
        if (checked) next.add(id);
        else next.delete(id);
      }
      if (!setsEqual(next, selected)) setSelected(next);
    },
    [selected, setSelected]
  );

  const setGroupAll = useCallback(
    (rows: PermissionMatrixGroup["rows"], checked: boolean) => {
      const next = new Set(selected);
      for (const row of rows) {
        for (const action of MATRIX_ACTIONS) {
          const id = row.permissions[action];
          if (!id) continue;
          if (checked) next.add(id);
          else next.delete(id);
        }
      }
      if (!setsEqual(next, selected)) setSelected(next);
    },
    [selected, setSelected]
  );

  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium">{tRolePerm("title")}</h3>
      {locked ? (
        <p className="text-sm text-muted-foreground">
          {tRolePerm("superAdminLocked")}
        </p>
      ) : null}
      <Input
        type="search"
        value={search}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setSearch(e.target.value)
        }
        placeholder={tSearch("placeholder")}
        disabled={locked}
        className="max-w-sm"
      />
      <div className="max-h-[min(24rem,50vh)] space-y-3 overflow-y-auto pr-1">
        {filteredGroups.map((group) => (
          <details key={group.root_id} open className="rounded-lg border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
              <span>{group.root_label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={locked}
                onClick={(e) => {
                  e.preventDefault();
                  setGroupAll(group.rows, true);
                }}
              >
                {tRolePerm("selectGroup")}
              </Button>
            </summary>
            <div className="overflow-x-auto border-t border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tRolePerm("menu")}</TableHead>
                    {MATRIX_ACTIONS.map((action) => (
                      <TableHead key={action} className="text-center">
                        {permissionActionLabel(action, (k) => tAction(k))}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">
                      {tRolePerm("selectAll")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row) => {
                    const permIds = MATRIX_ACTIONS.map(
                      (a) => row.permissions[a]
                    ).filter((id): id is number => id != null);
                    const rowAllChecked =
                      permIds.length > 0 &&
                      permIds.every((id) => selected.has(id));
                    const rowSome =
                      permIds.some((id) => selected.has(id)) && !rowAllChecked;
                    return (
                      <TableRow key={row.menu_id}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        {MATRIX_ACTIONS.map((action) => {
                          const permId = row.permissions[action];
                          if (!permId) {
                            return <TableCell key={action} />;
                          }
                          const checked =
                            locked || selected.has(permId);
                          return (
                            <TableCell key={action} className="text-center">
                              <Checkbox
                                checked={checked}
                                disabled={locked}
                                onCheckedChange={(v) =>
                                  togglePerm(
                                    row.permissions,
                                    action,
                                    v === true
                                  )
                                }
                                aria-label={`${row.label} ${action}`}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={rowAllChecked || (rowSome && !rowAllChecked)}
                            disabled={locked || permIds.length === 0}
                            onCheckedChange={(v) =>
                              setRowAll(row.permissions, v === true)
                            }
                            aria-label={tRolePerm("selectAll")}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
