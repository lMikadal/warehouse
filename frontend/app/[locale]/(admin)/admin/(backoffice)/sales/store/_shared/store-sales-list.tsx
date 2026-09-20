"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import { DatePicker, type DateRangeValue } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { Link, useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  fetchStoreSalesCount,
  fetchStoreSalesDetail,
  fetchStoreSalesList,
  OrderStoreApiError,
  patchStoreSalesStatus,
  type StoreSalesListItem,
  type StoreSalesStatus,
} from "@/lib/order-store-api";
import {
  loadStoreSalesSellerComboboxOptions,
  resolveStoreSalesSellerLabel,
} from "@/lib/order-store-sellers-combobox";
import { cn } from "@/lib/utils";

import {
  familySku,
  flattenListRows,
  formatFamilySplitSku,
} from "./store-sales-list-rows";
import {
  storeSalesStatusFilterButtonClass,
  storeSalesStatusPillClass,
} from "./store-sales-status-styles";

const STATUS_TABS: (StoreSalesStatus | "")[] = [
  "",
  "draft",
  "pending",
  "success",
  "cancelled",
  "rejected",
];

const COLUMN_COUNT = 9;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatItemCount(n: number): string {
  const r = Math.round(n);
  if (Math.abs(n - r) < 1e-6) return String(r);
  return String(n);
}

function storeSalesRowActions(
  status: StoreSalesStatus,
  canView: boolean,
  canUpdate: boolean
): TableIconActionKey[] {
  const actions: TableIconActionKey[] = [];
  if (status === "draft") {
    if (canUpdate) actions.push("edit", "cancel");
  } else if (status === "pending") {
    if (canView) actions.push("view");
    if (canUpdate) actions.push("cancel");
  } else if (canView) {
    actions.push("view");
  }
  return actions;
}

export function StoreSalesList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderStore");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_store");

  const listQuery = useCrudListQuery();
  const {
    page,
    pageSize,
    setPage,
    onPageSizeChange,
    query,
    onSearchChange,
    debouncedQuery,
    totalPages,
  } = listQuery;

  const [statusFilter, setStatusFilter] = useState<StoreSalesStatus | "">("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [sellerId, setSellerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StoreSalesListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [childrenByParent, setChildrenByParent] = useState<
    Record<number, StoreSalesListItem[]>
  >({});
  const [cancelId, setCancelId] = useState<number | null>(null);

  const dateFrom = dateRange?.from
    ? `${dateRange.from}T00:00:00.000Z`
    : undefined;
  const dateTo = dateRange?.to ? `${dateRange.to}T23:59:59.999Z` : undefined;

  const load = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        fetchStoreSalesList(locale, {
          page,
          limit: pageSize,
          search: debouncedQuery,
          status: statusFilter || undefined,
          date_from: dateFrom,
          date_to: dateTo,
          created_by: sellerId || undefined,
        }),
        fetchStoreSalesCount(locale, {
          search: debouncedQuery,
          date_from: dateFrom,
          date_to: dateTo,
          created_by: sellerId || undefined,
        }),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setCounts(count.by_status ?? {});
    } catch (e) {
      const msg =
        e instanceof OrderStoreApiError ? e.message : tError("loadFailed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [
    perms.view,
    locale,
    page,
    pageSize,
    debouncedQuery,
    statusFilter,
    dateFrom,
    dateTo,
    sellerId,
    tError,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleExpand = async (parent: StoreSalesListItem) => {
    const next = !expanded[parent.id];
    setExpanded((s) => ({ ...s, [parent.id]: next }));
    if (next && parent.child_count > 0 && !childrenByParent[parent.id]) {
      try {
        const detail = await fetchStoreSalesDetail(locale, parent.id);
        const kids = (detail.family ?? []).filter((f) => f.id !== parent.id);
        setChildrenByParent((m) => ({ ...m, [parent.id]: kids }));
      } catch {
        toast.error(tError("loadFailed"));
      }
    }
  };

  const expandedSet = useMemo(() => {
    const s = new Set<number>();
    for (const [k, v] of Object.entries(expanded)) {
      if (v) s.add(Number(k));
    }
    return s;
  }, [expanded]);

  const flatRows = useMemo(
    () => flattenListRows(rows, expandedSet, childrenByParent),
    [rows, expandedSet, childrenByParent]
  );

  const onCancelConfirm = async () => {
    if (cancelId == null) return;
    try {
      await patchStoreSalesStatus(locale, cancelId, "cancelled");
      toast.success(tCrud("toast.saved"));
      setCancelId(null);
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderStoreApiError ? e.message : tError("saveFailed")
      );
    }
  };

  if (!perms.view) {
    return (
      <p className="text-muted-foreground">{tError("forbidden")}</p>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("subtitle")}
        actions={
          perms.create ? (
            <Button asChild>
              <Link href="/admin/sales/store/new">
                <Plus className="text-current" aria-hidden />
                {tPage("create")}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex w-full min-w-0 flex-wrap items-end gap-3">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          className="min-w-0 flex-1"
        />
        <div className="w-full min-w-[14rem] max-w-[18rem] shrink-0">
          <DatePicker
            id="store-sales-date-range"
            mode="range"
            value={dateRange}
            onChange={(next) => {
              setDateRange(next);
              setPage(1);
            }}
            placeholder={tPage("dateRangePlaceholder")}
            aria-label={tPage("dateRange")}
            confirmLabel={tPage("confirm")}
            cancelLabel={tCrud("btn.cancel")}
            className="w-full"
          />
        </div>
        <div className="min-w-48 flex-1">
          <RemoteComboboxField
            label={tPage("colSeller")}
            value={sellerId}
            onValueChange={(v) => {
              setSellerId(v);
              setPage(1);
            }}
            placeholder={tCrud("filter.select", { label: tPage("colSeller") })}
            emptyLabel={tError("noData")}
            showClear
            inputClassName="w-full min-w-0"
            onLoadOptions={({ search, signal }) =>
              loadStoreSalesSellerComboboxOptions(locale, { search, signal })
            }
            resolveSelectedLabel={(value) =>
              resolveStoreSalesSellerLabel(locale, value)
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((st) => {
          const count =
            st === ""
              ? Object.values(counts).reduce((a, b) => a + b, 0)
              : counts[st] ?? 0;
          const active = statusFilter === st;
          return (
            <button
              key={st || "all"}
              type="button"
              className={storeSalesStatusFilterButtonClass(st, active)}
              aria-pressed={active}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              <span
                className={cn(
                  storeSalesStatusPillClass(st, {
                    allFilterActive: st === "" && active,
                  }),
                  !active && "opacity-55 hover:opacity-100"
                )}
              >
                {st === "" ? tPage("statusAll") : tPage(`saleStatus.${st}`)} (
                {count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="w-12">#</TableHead>
              <TableHead>{tPage("colSku")}</TableHead>
              <TableHead>{tPage("colMember")}</TableHead>
              <TableHead>{tPage("colOrderedAt")}</TableHead>
              <TableHead className="text-right tabular-nums">
                {tPage("colItems")}
              </TableHead>
              <TableHead className="text-right tabular-nums">
                {tPage("colTotal")}
              </TableHead>
              <TableHead className="text-center">{tPage("colStatus")}</TableHead>
              <TableHead>{tPage("colSeller")}</TableHead>
              <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <CrudListTableSkeleton columnCount={COLUMN_COUNT + 1} rowCount={pageSize} />
            ) : flatRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT + 1} className="text-center">
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              flatRows.map((row, idx) => {
                const isChild = row.kind === "child";
                const parent = rows[row.parentIndex];
                const base = parent?.sku ? familySku(parent.sku) : "";
                let skuDisplay = row.sku || "—";
                if (!isChild && row.child_count > 0 && base) {
                  skuDisplay = base;
                } else if (isChild && base) {
                  const sibs = childrenByParent[parent?.id ?? 0] ?? [];
                  const fi = sibs.findIndex((c) => c.id === row.id) + 1;
                  skuDisplay = formatFamilySplitSku(base, fi + 1);
                }
                const hideActions = !isChild && row.child_count > 0;
                const rowActions = hideActions
                  ? []
                  : storeSalesRowActions(
                      row.status,
                      perms.view,
                      perms.update
                    );
                return (
                  <TableRow
                    key={row.id}
                    className={cn(isChild && "bg-muted/30")}
                  >
                    <TableCell>
                      {!isChild && row.child_count > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="size-10 shrink-0 p-0"
                          onClick={() => void toggleExpand(row)}
                          aria-expanded={!!expanded[row.id]}
                        >
                          {expanded[row.id] ? (
                            <ChevronDown className="text-current" />
                          ) : (
                            <ChevronRight className="text-current" />
                          )}
                        </Button>
                      ) : null}
                    </TableCell>
                    <TableCell>{isChild ? "" : row.parentIndex + 1}</TableCell>
                    <TableCell>{skuDisplay}</TableCell>
                    <TableCell>
                      {isChild ? "—" : row.member_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {isChild
                        ? "—"
                        : formatDateTime(
                            row.ordered_at ?? row.created_at,
                            locale
                          )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatItemCount(row.item_count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.total_price, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      {!( !isChild && row.child_count > 0) ? (
                        <span
                          className={storeSalesStatusPillClass(row.status)}
                        >
                          {tPage(`saleStatus.${row.status}`)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {isChild ? "—" : row.created_by_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {rowActions.length > 0 ? (
                        <TableIconActions
                          actions={rowActions}
                          onAction={(action) => {
                            if (action === "cancel") {
                              setCancelId(row.id);
                              return;
                            }
                            router.push(`/admin/sales/store/${row.id}`);
                          }}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CrudPaginationBar
        page={page}
        pageSize={pageSize}
        meta={{ total, totalPages: totalPages(total) }}
        onPageChange={setPage}
        onPageSizeChange={(size) => onPageSizeChange(size as typeof pageSize)}
      />

      <CrudDeleteConfirmDialog
        open={cancelId != null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title={tPage("confirmCancel")}
        onConfirm={() => void onCancelConfirm()}
      />
    </div>
  );
}
