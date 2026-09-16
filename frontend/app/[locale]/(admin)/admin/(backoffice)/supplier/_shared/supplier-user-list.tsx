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
  type TableSortDirection,
} from "@/components/ui/table";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { Link, useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { tableIconActionsFromResource } from "@/lib/admin-permissions";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  deleteSupplierUser,
  fetchSupplierUsers,
  patchSupplierUser,
  SupplierUserApiError,
  type SupplierListItem,
} from "@/lib/supplier-user-api";

const COLUMN_COUNT = 7;

function sortFieldLabel(
  tCrud: ReturnType<typeof useTranslations<"crud">>,
  tCol: ReturnType<typeof useTranslations<"col">>,
  sortKey: string | null,
  sortDir: TableSortDirection | null,
  fieldKey: string
): string {
  const field = tCol(fieldKey === "is_active" ? "status" : fieldKey);
  if (sortKey !== fieldKey || !sortDir) {
    return tCrud("sort.none", { field });
  }
  return sortDir === "desc"
    ? tCrud("sort.desc", { field })
    : tCrud("sort.asc", { field });
}

function formatCredit(
  tSupplier: ReturnType<typeof useTranslations<"supplier">>,
  days: number | null | undefined
) {
  if (days != null && days > 0) {
    return tSupplier("creditDays", { days });
  }
  return tSupplier("creditNone");
}

export function SupplierUserList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.supplierUser");
  const tCol = useTranslations("col");
  const tSupplier = useTranslations("supplier");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const t = useTranslations();
  const perms = useResourcePermissions("supplier", "supplier_user");
  const listQuery = useCrudListQuery();
  const {
    query,
    onSearchChange,
    onStatusFilterChange,
    sortKey,
    sortDir,
    handleSortChange,
    listFiltered,
  } = listQuery;

  const [rows, setRows] = useState<SupplierListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { sort, order } = listQuery.sortParamsForFetch;
  const listFetchKey = useMemo(
    () =>
      [
        locale,
        listQuery.page,
        listQuery.pageSize,
        listQuery.debouncedQuery,
        listQuery.isActiveFromStatus ?? "",
        sort ?? "",
        order ?? "",
      ].join("|"),
    [
      locale,
      listQuery.page,
      listQuery.pageSize,
      listQuery.debouncedQuery,
      listQuery.isActiveFromStatus,
      sort,
      order,
    ]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSupplierUsers(locale, {
        page: listQuery.page,
        limit: listQuery.pageSize,
        search: listQuery.debouncedQuery.trim() || undefined,
        isActive: listQuery.isActiveFromStatus,
        sort: sort ?? undefined,
        order: order ?? undefined,
      });
      setRows(res.rows);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(
        e instanceof SupplierUserApiError ? e.message : t("error.generic")
      );
    } finally {
      setLoading(false);
    }
  }, [
    locale,
    listQuery.page,
    listQuery.pageSize,
    listQuery.debouncedQuery,
    listQuery.isActiveFromStatus,
    sort,
    order,
    t,
  ]);

  useEffect(() => {
    void load();
  }, [listFetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowActions = (row: SupplierListItem): TableIconActionKey[] =>
    tableIconActionsFromResource(perms);

  const onRowAction = (row: SupplierListItem, action: TableIconActionKey) => {
    if (action === "edit" || action === "view") {
      router.push(`/admin/supplier/${row.id}`);
      return;
    }
    if (action === "delete") setDeleteId(row.id);
  };

  const onToggleActive = async (row: SupplierListItem, next: boolean) => {
    try {
      await patchSupplierUser(locale, row.id, { is_active: next });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r))
      );
    } catch (e) {
      toast.error(
        e instanceof SupplierUserApiError ? e.message : t("error.generic")
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("desc")}
        actions={
          perms.create ? (
            <Button asChild size="lg">
              <Link href="/admin/supplier/new">
                <Plus className="size-4" aria-hidden />
                {tPage("add")}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField value={query} onChange={onSearchChange} />
        <StatusFilterGroup
          value={listQuery.statusFilter}
          onChange={onStatusFilterChange}
        />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableSortHead
                columnKey="sku"
                sortable={!listFiltered}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "sku"
                )}
              >
                {tCol("sku")}
              </TableSortHead>
              <TableHead>{tCol("company")}</TableHead>
              <TableHead>{tCol("contact")}</TableHead>
              <TableHead>{tCol("credit")}</TableHead>
              <TableSortHead
                className="text-center"
                columnKey="is_active"
                sortable={!listFiltered}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "is_active"
                )}
                align="center"
              >
                {tCol("status")}
              </TableSortHead>
              <TableSortHead
                columnKey="updated_at"
                sortable={!listFiltered}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={
                  sortKey !== "updated_at" || !sortDir
                    ? tCrud("sort.none", { field: tCol("updatedAt") })
                    : sortDir === "desc"
                      ? tCrud("sort.desc", { field: tCol("updatedAt") })
                      : tCrud("sort.asc", { field: tCol("updatedAt") })
                }
              >
                {tCol("updatedAt")}
              </TableSortHead>
              <TableHead className="data-table__actions-col w-[1%]">
                {tCol("action")}
              </TableHead>
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
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{row.sku}</span>
                      <span className="text-muted-foreground text-xs">
                        {tCol("taxNumber")}: {row.tax_number || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{row.company_name || "—"}</span>
                      <span className="text-muted-foreground line-clamp-1 text-xs">
                        {row.company_address || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{row.contact_tel || "—"}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.contact_email || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCredit(tSupplier, row.credit_term)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusSwitchField
                        checked={row.is_active}
                        disabled={!perms.update}
                        onCheckedChange={(v) => void onToggleActive(row, v)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDateTime(row.updated_at, locale)}
                  </TableCell>
                  <TableCell className="data-table__actions-cell">
                    <div className="data-table__actions">
                      <TableIconActions
                        actions={rowActions(row)}
                        onAction={(action) => onRowAction(row, action)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CrudPaginationBar
        page={listQuery.page}
        pageSize={listQuery.pageSize}
        meta={{
          total,
          totalPages: Math.max(1, Math.ceil(total / listQuery.pageSize)),
        }}
        onPageChange={listQuery.setPage}
        onPageSizeChange={listQuery.onPageSizeChange}
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId == null) return;
          try {
            await deleteSupplierUser(locale, deleteId);
            toast.success(tCrud("toast.deleted"));
            setDeleteId(null);
            void load();
          } catch (e) {
            toast.error(
              e instanceof SupplierUserApiError ? e.message : t("error.generic")
            );
          }
        }}
      />
    </div>
  );
}
