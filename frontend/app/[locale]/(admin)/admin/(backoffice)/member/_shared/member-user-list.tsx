"use client";

import { Coins, Copy, UserCheck, UserPlus, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker, type DateRangeValue } from "@/components/ui/date-picker";
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
import type { PageSizeOption } from "@/lib/crud-pagination";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useAdminBackofficeActor,
  useResourcePermissions,
} from "@/lib/admin-backoffice-actor-context";
import { tableIconActionsFromResource } from "@/lib/admin-permissions";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  deleteMemberUser,
  fetchMemberUsers,
  fetchMemberUserStats,
  MemberUserApiError,
  patchMemberUser,
  type MemberUserListItem,
  type MemberUserStats,
} from "@/lib/member-user-api";
import { loadMemberUserBusinessFilterOptions } from "@/lib/member-user-filters-combobox";
import { cn } from "@/lib/utils";

const COLUMN_COUNT = 9;

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

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
      <div className="rounded-md bg-primary/10 p-2 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-xl font-semibold tabular-nums">
          {value}
          {unit ? (
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              {unit}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function MemberUserList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.memberUser");
  const tMu = useTranslations("memberUser");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const t = useTranslations();
  const perms = useResourcePermissions("member", "member_user");
  const actor = useAdminBackofficeActor();
  const showSalesStat = actor.type === "superadmin";

  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>(
    undefined
  );
  const [businessId, setBusinessId] = useState("");

  const listQuery = useCrudListQuery({
    extraFiltered: Boolean(
      dateRange?.from || dateRange?.to || businessId
    ),
  });
  const {
    query,
    onSearchChange,
    onStatusFilterChange,
    sortKey,
    sortDir,
    handleSortChange,
    listFiltered,
    page,
    pageSize,
    setPage,
    onPageSizeChange,
    debouncedQuery,
    isActiveFromStatus,
    sortParamsForFetch,
  } = listQuery;

  const [rows, setRows] = useState<MemberUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemberUserStats | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const listFetchKey = useMemo(
    () =>
      JSON.stringify({
        page,
        pageSize,
        debouncedQuery,
        isActiveFromStatus,
        sort: sortParamsForFetch.sort,
        order: sortParamsForFetch.order,
        dateFrom: dateRange?.from ?? "",
        dateTo: dateRange?.to ?? "",
        businessId,
      }),
    [
      page,
      pageSize,
      debouncedQuery,
      isActiveFromStatus,
      sortParamsForFetch,
      dateRange?.from,
      dateRange?.to,
      businessId,
    ]
  );

  useEffect(() => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- list fetch loading
    setLoading(true);
    void fetchMemberUserStats(locale)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {});
    void fetchMemberUsers(locale, {
      page,
      limit: pageSize,
      search: debouncedQuery.trim() || undefined,
      isActive: isActiveFromStatus,
      sort: sortParamsForFetch.sort,
      order: sortParamsForFetch.order,
      created_from: dateRange?.from || undefined,
      created_to: dateRange?.to || undefined,
      business_id: businessId ? Number(businessId) : undefined,
    })
      .then(({ rows: data, meta }) => {
        if (cancelled) return;
        setRows(data);
        setTotal(meta.total);
      })
      .catch(() => {
        if (!cancelled) toast.error(t("error.generic"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, listFetchKey, perms.view, page, pageSize, t]);

  const onToggleActive = useCallback(
    async (row: MemberUserListItem, next: boolean) => {
      if (!perms.update) return;
      try {
        await patchMemberUser(locale, row.id, { is_active: next });
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r))
        );
        toast.success(tCrud("toast.saved"));
      } catch {
        toast.error(t("error.generic"));
      }
    },
    [locale, perms.update, tCrud, t]
  );

  const onConfirmDelete = useCallback(async () => {
    if (deleteId == null || !perms.delete) return;
    try {
      await deleteMemberUser(locale, deleteId);
      toast.success(tCrud("toast.deleted"));
      setDeleteId(null);
      setPage(1);
    } catch (e) {
      toast.error(
        e instanceof MemberUserApiError ? e.message : t("error.generic")
      );
    }
  }, [deleteId, locale, perms.delete, setPage, tCrud, t]);

  const rowActions = (row: MemberUserListItem): TableIconActionKey[] =>
    tableIconActionsFromResource(perms);

  const onRowAction = (row: MemberUserListItem, action: TableIconActionKey) => {
    if (action === "edit" || action === "view") {
      router.push(`/admin/member/users/${row.id}`);
      return;
    }
    if (action === "delete") setDeleteId(row.id);
  };

  const copySku = useCallback(
    async (sku: string | null | undefined) => {
      if (!sku) return;
      try {
        await navigator.clipboard.writeText(sku);
        toast.success(tMu("copied"));
      } catch {
        toast.error(tMu("copyFailed"));
      }
    },
    [tMu]
  );

  if (!perms.view) {
    return (
      <p className="text-muted-foreground p-6">{tError("forbidden")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("desc")}
        actions={
          perms.create ? (
            <Button asChild>
              <Link href="/admin/member/users/new">{tPage("add")}</Link>
            </Button>
          ) : null
        }
      />

      {stats ? (
        <div
          className={cn(
            "grid gap-3 sm:grid-cols-2",
            showSalesStat ? "xl:grid-cols-4" : "xl:grid-cols-3"
          )}
        >
          <StatCard
            icon={Users}
            label={tMu("totalCustomers")}
            value={String(stats.total_customers)}
            unit={tMu("listUnit")}
          />
          <StatCard
            icon={UserCheck}
            label={tMu("members")}
            value={String(stats.active_members)}
            unit={tMu("personUnit")}
          />
          <StatCard
            icon={UserPlus}
            label={tMu("newThisMonth")}
            value={String(stats.new_this_month)}
            unit={tMu("personUnit")}
          />
          {showSalesStat ? (
            <StatCard
              icon={Coins}
              label={tMu("salesThisMonth")}
              value={String(stats.sales_this_month ?? 0)}
              unit={tMu("bahtUnit")}
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex w-full min-w-0 items-end gap-3">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          className="min-w-0 flex-1"
        />
        <div className="w-full min-w-[14rem] max-w-[18rem] shrink-0">
          <DatePicker
            id="member-date-range"
            mode="range"
            value={dateRange}
            onChange={(next) => {
              setDateRange(next);
              setPage(1);
            }}
            placeholder={tMu("dateRangePlaceholder")}
            aria-label={tMu("dateRange")}
            confirmLabel={tMu("confirm")}
            cancelLabel={tCrud("btn.cancel")}
            className="w-full"
          />
        </div>
        <div className="min-w-48 flex-1">
          <RemoteComboboxField
            label={tMu("business")}
            value={businessId}
            onValueChange={(v) => {
              setBusinessId(v);
              setPage(1);
            }}
            placeholder={t("crud.filter.select", {
              label: tMu("business"),
            })}
            emptyLabel={t("form.combobox.noResults")}
            inputClassName="w-full min-w-0"
            showClear
          onLoadOptions={async ({ search }) => {
            const { options } = await loadMemberUserBusinessFilterOptions(
              locale,
              search,
              1,
              businessId ? Number(businessId) : undefined
            );
            return options;
          }}
          />
        </div>
        <StatusFilterGroup
          value={listQuery.statusFilter}
          onChange={onStatusFilterChange}
          className="ml-auto shrink-0"
        />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[3rem]">{tMu("colIndex")}</TableHead>
              <TableSortHead
                columnKey="name"
                sortable={!listFiltered}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "name"
                )}
              >
                {tMu("customerName")}
              </TableSortHead>
              <TableHead>{tCol("tel")}</TableHead>
              <TableHead>{tMu("business")}</TableHead>
              <TableHead className="text-right tabular-nums">
                {tMu("annualPurchase")}
              </TableHead>
              <TableHead>{tMu("lastPurchase")}</TableHead>
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
                columnKey="created_at"
                sortable={!listFiltered}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "created_at"
                )}
              >
                {tMu("memberSince")}
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
              rows.map((row, idx) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {(page - 1) * pageSize + idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{row.name}</span>
                      {row.sku ? (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          {row.sku}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            aria-label={tMu("copySku")}
                            onClick={() => void copySku(row.sku)}
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{row.tel || "—"}</TableCell>
                  <TableCell>
                    {row.business_label ? (
                      <Badge variant="secondary">{row.business_label}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">0</TableCell>
                  <TableCell>—</TableCell>
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
                    {formatDateTime(row.created_at, locale)}
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
        page={page}
        pageSize={pageSize}
        meta={{
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        }}
        onPageChange={setPage}
        onPageSizeChange={(size) =>
          onPageSizeChange(size as PageSizeOption)
        }
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  );
}
