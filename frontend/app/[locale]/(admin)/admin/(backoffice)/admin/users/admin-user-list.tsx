"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import {
  StatusBadge,
  USER_ACCOUNT_STATUSES,
  type UserAccountStatus,
} from "@/components/molecules/status-badge";
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
import { useAdminBackofficeActor } from "@/lib/admin-backoffice-actor-context";
import {
  loadAdminRoleComboboxOptions,
  resolveAdminRoleComboboxLabel,
} from "@/lib/admin-role-combobox";
import {
  AdminUserApiError,
  BOOTSTRAP_ADMIN_USER_ID,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  patchAdminUser,
  type AdminUserListParams,
  type AdminUserRow,
} from "@/lib/admin-user-api";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

import {
  AdminUserEditSheet,
  type AdminUserEditPayload,
  type AdminUserEditSheetProps,
  type AdminUserSaveOptions,
  type AdminUserSheetState,
} from "./admin-user-edit-sheet";

const COLUMN_COUNT = 8;

const USER_STATUSES = ["active", "inactive", "suspended", "locked"] as const;
const USER_TYPES = ["superadmin", "owner", "manager", "staff"] as const;

function sortApiKey(
  col:
    | "username"
    | "email"
    | "type"
    | "status"
    | "lastLogin"
    | "updatedAt"
): string {
  switch (col) {
    case "lastLogin":
      return "last_login_at";
    case "updatedAt":
      return "updated_at";
    default:
      return col;
  }
}

function EnumFilterGroup({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  const tCrud = useTranslations("crud");
  const items = [{ value: "", label: tCrud("filter.all") }, ...options];
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded-lg border border-border"
    >
      {items.map((opt, index) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value || "all"}
            type="button"
            variant="ghost"
            size="lg"
            aria-pressed={active}
            className={cn(
              "rounded-none border-0 px-3 shadow-none",
              index > 0 && "border-l border-border",
              active &&
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

function toUserAccountStatus(status: string): UserAccountStatus {
  return USER_ACCOUNT_STATUSES.includes(status as UserAccountStatus)
    ? (status as UserAccountStatus)
    : "inactive";
}

export function AdminUserList() {
  const locale = useLocale() as DisplayLocale;
  const actor = useAdminBackofficeActor();
  const tToast = useTranslations("toast");
  const tPage = useTranslations("page.adminUser");
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tError = useTranslations("error");
  const tUserType = useTranslations("userType");
  const tUserStatus = useTranslations("userStatus");
  const tComboboxEmpty = useTranslations("form.combobox");
  const [roleFilter, setRoleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilterCol, setStatusFilterCol] = useState("");
  const columnFiltersActive =
    roleFilter !== "" || typeFilter !== "" || statusFilterCol !== "";

  const {
    query,
    setPage,
    pageSize,
    sortKey,
    sortDir,
    baseListParams,
    safePage,
    totalPages,
    handleSortChange,
    onSearchChange,
    onPageSizeChange,
    clearSortAndPage,
  } = useCrudListQuery({ extraFiltered: columnFiltersActive });

  const listFetchParams = useMemo((): AdminUserListParams => {
    const roleId = roleFilter ? Number(roleFilter) : undefined;
    return {
      ...baseListParams,
      admin_role_id:
        roleId != null && Number.isFinite(roleId) ? roleId : undefined,
      type: typeFilter || undefined,
      status: statusFilterCol || undefined,
    };
  }, [baseListParams, roleFilter, typeFilter, statusFilterCol]);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<AdminUserSheetState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    AdminUserEditSheetProps["serverFieldErrors"]
  >();

  const typeFilterOptions = useMemo(() => {
    const types =
      actor.type === "superadmin"
        ? USER_TYPES
        : USER_TYPES.filter((v) => v !== "superadmin");
    return types.map((v) => ({ value: v, label: tUserType(v) }));
  }, [actor.type, tUserType]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminUsers(locale, listFetchParams);
      setRows(result.rows);
      setListMeta(result.meta);
    } catch (err: unknown) {
      toast.error(
        err instanceof AdminUserApiError ? err.message : tToast("demoError")
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

  const handleSave = async (
    id: number | null,
    payload: AdminUserEditPayload,
    options: AdminUserSaveOptions
  ) => {
    setServerFieldErrors(undefined);
    try {
      if (id == null) {
        await createAdminUser(locale, {
          username: payload.username,
          email: payload.email || undefined,
          password: payload.password,
          admin_role_id: payload.adminRoleId,
          type: payload.type,
          status: payload.status,
        });
        toast.success(tCrud("toast.created"));
      } else {
        const body: Parameters<typeof patchAdminUser>[2] = {
          email: payload.email || null,
        };
        if (id !== BOOTSTRAP_ADMIN_USER_ID) {
          body.admin_role_id = payload.adminRoleId;
          body.type = payload.type;
          body.status = payload.status;
        }
        if (options.changePassword && payload.password) {
          body.password = payload.password;
        }
        if (options.changeCreditPin && payload.creditPin) {
          body.password_credit = payload.creditPin;
        }
        if (options.changeDiscountPin && payload.discountPin) {
          body.password_discount = payload.discountPin;
        }
        await patchAdminUser(locale, id, body);
        toast.success(tCrud("toast.saved"));
      }
      setSheet(null);
      await loadList();
    } catch (err) {
      if (err instanceof AdminUserApiError) {
        if (err.code === "conflict") {
          setServerFieldErrors({ username: tError("usernameTaken") });
          return;
        }
        toast.error(err.message);
      } else {
        toast.error(tToast("demoError"));
      }
    }
  };

  const handleRowAction = (id: number, action: TableIconActionKey) => {
    if (action === "delete") {
      if (id === actor.id) {
        toast.error(tError("cannotDeleteSelf"));
        return;
      }
      if (id === BOOTSTRAP_ADMIN_USER_ID) return;
      setDeleteId(id);
      return;
    }
    if (action === "edit") {
      const row = rows.find((r) => r.id === id);
      if (row) {
        setServerFieldErrors(undefined);
        setSheet({ mode: "edit", row });
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId == null) return;
    if (deleteId === actor.id) {
      toast.error(tError("cannotDeleteSelf"));
      setDeleteId(null);
      return;
    }
    try {
      await deleteAdminUser(locale, deleteId);
      setDeleteId(null);
      toast.success(tCrud("toast.deleted"));
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof AdminUserApiError ? err.message : tToast("demoError")
      );
    }
  };

  const onColumnFilterChange = (fn: () => void) => {
    fn();
    clearSortAndPage();
  };

  const roleFilterLabel = tCol("role");
  const typeFilterLabel = tCol("type");

  return (
    <div className="space-y-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("desc")}
        actions={
          <Button type="button" size="lg" onClick={() => setSheet({ mode: "create" })}>
            <Plus className="size-4" aria-hidden />
            {tPage("add")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <CrudSearchField value={query} onChange={onSearchChange} />
        <RemoteComboboxField
          id="admin-user-filter-role"
          label={roleFilterLabel}
          value={roleFilter}
          onValueChange={(v) =>
            onColumnFilterChange(() => setRoleFilter(v))
          }
          placeholder={tCrud("filter.select", { label: roleFilterLabel })}
          emptyLabel={tComboboxEmpty("noResults")}
          inputClassName="w-[min(100%,14rem)]"
          showClear
          onLoadOptions={(ctx) =>
            loadAdminRoleComboboxOptions(locale, {
              search: ctx.search,
              signal: ctx.signal,
              activeOnly: false,
            })
          }
          resolveSelectedLabel={(value) =>
            resolveAdminRoleComboboxLabel(locale, value)
          }
        />
        <RemoteComboboxField
          id="admin-user-filter-type"
          label={typeFilterLabel}
          value={typeFilter}
          onValueChange={(v) =>
            onColumnFilterChange(() => setTypeFilter(v))
          }
          placeholder={tCrud("filter.select", { label: typeFilterLabel })}
          emptyLabel={tComboboxEmpty("noResults")}
          inputClassName="w-[min(100%,14rem)]"
          showClear
          onLoadOptions={async ({ search, signal }) => {
            signal.throwIfAborted();
            const q = search.trim().toLowerCase();
            return typeFilterOptions
              .filter(
                (o) => !q || o.label.toLowerCase().includes(q)
              )
              .map((o) => ({ value: o.value, label: o.label }));
          }}
          resolveSelectedLabel={async (value) => {
            const found = typeFilterOptions.find((o) => o.value === value);
            return found?.label ?? null;
          }}
        />
        <EnumFilterGroup
          ariaLabel={tCol("status")}
          value={statusFilterCol}
          onChange={(v) => onColumnFilterChange(() => setStatusFilterCol(v))}
          options={USER_STATUSES.map((v) => ({
            value: v,
            label: tUserStatus(v),
          }))}
        />
      </div>

      <div className="surface-table-wrap overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableSortHead
                columnKey={sortApiKey("username")}
                sortable={!columnFiltersActive}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={tCol("username")}
              >
                {tCol("username")}
              </TableSortHead>
              <TableSortHead
                columnKey={sortApiKey("email")}
                sortable={!columnFiltersActive}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={tCol("email")}
              >
                {tCol("email")}
              </TableSortHead>
              <TableHead>{tCol("role")}</TableHead>
              <TableSortHead
                columnKey={sortApiKey("type")}
                sortable={!columnFiltersActive}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={tCol("type")}
              >
                {tCol("type")}
              </TableSortHead>
              <TableSortHead
                columnKey={sortApiKey("status")}
                align="center"
                sortable={!columnFiltersActive}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={tCol("status")}
              >
                {tCol("status")}
              </TableSortHead>
              <TableSortHead
                columnKey={sortApiKey("lastLogin")}
                align="center"
                sortable={!columnFiltersActive}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={tCol("lastLogin")}
              >
                {tCol("lastLogin")}
              </TableSortHead>
              <TableSortHead
                columnKey={sortApiKey("updatedAt")}
                align="center"
                sortable={!columnFiltersActive}
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
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center">
                  …
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center">
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.username}</TableCell>
                  <TableCell>{row.email ?? "—"}</TableCell>
                  <TableCell>{row.role_name || "—"}</TableCell>
                  <TableCell>
                    {USER_TYPES.includes(row.type as (typeof USER_TYPES)[number])
                      ? tUserType(row.type as (typeof USER_TYPES)[number])
                      : row.type}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge userStatus={toUserAccountStatus(row.status)} />
                  </TableCell>
                  <TableCell className="text-center">
                    {row.last_login_at
                      ? formatDateTime(row.last_login_at, locale)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatDateTime(row.updated_at, locale)}
                  </TableCell>
                  <TableCell className="text-center">
                    <TableIconActions
                      actions={
                        row.id === BOOTSTRAP_ADMIN_USER_ID
                          ? ["edit"]
                          : ["edit", "delete"]
                      }
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

      <AdminUserEditSheet
        state={sheet}
        locale={locale}
        serverFieldErrors={serverFieldErrors}
        onOpenChange={(open) => !open && setSheet(null)}
        onSave={handleSave}
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
