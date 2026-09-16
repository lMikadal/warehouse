"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSortHead,
} from "@/components/ui/table";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  tableIconActionsFromResource,
  tableRowDetailAction,
} from "@/lib/admin-permissions";
import {
  AdminRoleApiError,
  BOOTSTRAP_ADMIN_ROLE_ID,
  createAdminRole,
  deleteAdminRole,
  fetchAdminRoleById,
  fetchAdminRoles,
  patchAdminRole,
  type AdminRoleListParams,
  type AdminRoleRow,
} from "@/lib/admin-role-api";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";

import {
  AdminRoleEditSheet,
  type AdminRoleEditPayload,
  type AdminRoleSheetState,
} from "./admin-role-edit-sheet";

const COLUMN_COUNT = 4;

type ColSortKey = "name" | "status" | "updatedAt";

function sortApiKey(col: ColSortKey): string {
  return col === "status" ? "is_active" : col === "updatedAt" ? "updated_at" : "name";
}

export function AdminRoleList() {
  const locale = useLocale() as DisplayLocale;
  const tToast = useTranslations("toast");
  const tPage = useTranslations("page.adminRole");
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tError = useTranslations("error");
  const perm = useResourcePermissions("admin", "admin_role");

  const {
    query,
    statusFilter,
    setPage,
    pageSize,
    sortKey,
    sortDir,
    baseListParams,
    safePage,
    totalPages,
    handleSortChange,
    onSearchChange,
    onStatusFilterChange,
    onPageSizeChange,
  } = useCrudListQuery();

  const listFetchParams = useMemo((): AdminRoleListParams => {
    return { ...baseListParams };
  }, [baseListParams]);

  const [rows, setRows] = useState<AdminRoleRow[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<AdminRoleSheetState | null>(null);
  const [roleDetail, setRoleDetail] = useState<Awaited<
    ReturnType<typeof fetchAdminRoleById>
  > | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminRoles(locale, listFetchParams);
      setRows(result.rows);
      setListMeta(result.meta);
    } catch (err: unknown) {
      toast.error(
        err instanceof AdminRoleApiError ? err.message : tToast("demoError")
      );
    } finally {
      setLoading(false);
    }
  }, [locale, listFetchParams, tToast]);

  useEffect(() => {
    queueMicrotask(() => void loadList());
  }, [loadList]);

  const total = listMeta.total;
  const page = safePage(total);

  const openEdit = async (row: AdminRoleRow) => {
    setSheet({ mode: "edit", row });
    try {
      const detail = await fetchAdminRoleById(locale, row.id);
      setRoleDetail(detail);
    } catch (err) {
      toast.error(
        err instanceof AdminRoleApiError ? err.message : tToast("demoError")
      );
      setSheet(null);
    }
  };

  const handleToggleActive = (id: number, active: boolean) => {
    if (id === BOOTSTRAP_ADMIN_ROLE_ID) return;
    const prev = rows.find((r) => r.id === id);
    if (!prev) return;
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, is_active: active } : r))
    );
    void patchAdminRole(locale, id, { is_active: active })
      .then(() => {
        toast.success(tCrud("toast.saved"));
        return loadList();
      })
      .catch((err) => {
        setRows((current) =>
          current.map((r) =>
            r.id === id ? { ...r, is_active: prev.is_active } : r
          )
        );
        toast.error(
          err instanceof AdminRoleApiError ? err.message : tToast("demoError")
        );
      });
  };

  const handleSave = async (id: number | null, payload: AdminRoleEditPayload) => {
    try {
      const body = {
        is_active: payload.isActive,
        names: { th: payload.nameTh, en: payload.nameEn },
        permission_ids: payload.permissionIds,
      };
      if (id == null) {
        await createAdminRole(locale, body);
        toast.success(tCrud("toast.created"));
      } else {
        await patchAdminRole(locale, id, body);
        toast.success(tCrud("toast.saved"));
      }
      setSheet(null);
      setRoleDetail(null);
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof AdminRoleApiError ? err.message : tToast("demoError")
      );
    }
  };

  const handleRowAction = (id: number, action: TableIconActionKey) => {
    if (action === "delete") {
      if (id === BOOTSTRAP_ADMIN_ROLE_ID) return;
      setDeleteId(id);
      return;
    }
    if (tableRowDetailAction(action)) {
      const row = rows.find((r) => r.id === id);
      if (row) void openEdit(row);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteAdminRole(locale, deleteId);
      setDeleteId(null);
      toast.success(tCrud("toast.deleted"));
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof AdminRoleApiError ? err.message : tToast("demoError")
      );
    }
  };

  return (
    <div className="space-y-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("desc")}
        actions={
          perm.create ? (
            <Button
              type="button"
              size="lg"
              onClick={() => {
                setRoleDetail(null);
                setSheet({ mode: "create" });
              }}
            >
              <Plus className="size-4" aria-hidden />
              {tPage("add")}
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <CrudSearchField value={query} onChange={onSearchChange} />
        <StatusFilterGroup
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
      </div>

      <div className="surface-table-wrap overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableSortHead
                columnKey={sortApiKey("name")}
                sortable
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={tCol("name")}
              >
                {tCol("name")}
              </TableSortHead>
              <TableSortHead
                columnKey={sortApiKey("status")}
                align="center"
                sortable
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={tCol("status")}
              >
                {tCol("status")}
              </TableSortHead>
              <TableSortHead
                columnKey={sortApiKey("updatedAt")}
                align="center"
                sortable
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={tCol("updatedAt")}
              >
                {tCol("updatedAt")}
              </TableSortHead>
              <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <CrudListTableSkeleton columnCount={COLUMN_COUNT} rowCount={10} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center">
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-center">
                    <StatusSwitchField
                      checked={row.is_active}
                      disabled={
                        !perm.update || row.id === BOOTSTRAP_ADMIN_ROLE_ID
                      }
                      onCheckedChange={(v) => handleToggleActive(row.id, v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {formatDateTime(row.updated_at, locale)}
                  </TableCell>
                  <TableCell className="text-center">
                    <TableIconActions
                      actions={tableIconActionsFromResource(perm, {
                        rowId: row.id,
                        editOnlyRowId: BOOTSTRAP_ADMIN_ROLE_ID,
                      })}
                      onAction={(action) => handleRowAction(row.id, action)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CrudPaginationBar
        page={page}
        pageSize={pageSize}
        meta={{ total, totalPages: totalPages(total) }}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
      />

      <AdminRoleEditSheet
        state={sheet}
        locale={locale}
        canSave={
          sheet?.mode === "create" ? perm.create : sheet != null && perm.update
        }
        onOpenChange={(open) => {
          if (!open) {
            setSheet(null);
            setRoleDetail(null);
          }
        }}
        onSave={handleSave}
        initialDetail={
          sheet?.mode === "edit" && roleDetail
            ? {
                names: roleDetail.names,
                permission_ids: roleDetail.permission_ids,
                is_active: roleDetail.is_active,
              }
            : null
        }
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
