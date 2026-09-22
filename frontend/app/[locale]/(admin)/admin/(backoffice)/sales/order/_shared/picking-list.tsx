"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
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
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { formatDateTime, type DisplayLocale } from "@/lib/format-datetime";
import {
  fetchPickingCount,
  fetchPickingList,
  fetchPickingPayments,
  OrderPickingApiError,
  PICKING_STATUSES,
  type PickingListItem,
  type PickingPaymentDetail,
  type PickingStatus,
} from "@/lib/order-picking-api";
import { cn } from "@/lib/utils";

import { familySku, flattenPickingRows } from "../_lib/picking-lines";
import {
  pickingStatusFilterButtonClass,
  pickingStatusPillClass,
} from "./picking-status-styles";

const STATUS_TABS: (PickingStatus | "")[] = ["", ...PICKING_STATUSES];

const COLUMN_COUNT = 8;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function PickingList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPicking");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_order");

  const {
    page,
    pageSize,
    setPage,
    onPageSizeChange,
    query,
    onSearchChange,
    debouncedQuery,
    totalPages,
  } = useCrudListQuery();

  const [statusFilter, setStatusFilter] = useState<PickingStatus | "">("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PickingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [paymentsByOrder, setPaymentsByOrder] = useState<
    Record<number, PickingPaymentDetail[]>
  >({});

  const dateFrom = dateRange?.from ? `${dateRange.from}T00:00:00.000Z` : undefined;
  const dateTo = dateRange?.to ? `${dateRange.to}T23:59:59.999Z` : undefined;

  const load = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        fetchPickingList({
          page,
          limit: pageSize,
          search: debouncedQuery,
          status: statusFilter || undefined,
          date_from: dateFrom,
          date_to: dateTo,
        }),
        fetchPickingCount({
          search: debouncedQuery,
          date_from: dateFrom,
          date_to: dateTo,
        }),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setCounts(count.by_status ?? {});
      setExpanded({});
      setPaymentsByOrder({});
    } catch (e) {
      toast.error(
        e instanceof OrderPickingApiError ? e.message : tPage("loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [
    perms.view,
    page,
    pageSize,
    debouncedQuery,
    statusFilter,
    dateFrom,
    dateTo,
    tPage,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleExpand = async (row: PickingListItem) => {
    const next = !expanded[row.id];
    setExpanded((s) => ({ ...s, [row.id]: next }));
    if (next && !paymentsByOrder[row.id]) {
      try {
        const res = await fetchPickingPayments(row.id);
        setPaymentsByOrder((m) => ({ ...m, [row.id]: res.items }));
      } catch {
        toast.error(tPage("loadFailed"));
      }
    }
  };

  const expandedSet = useMemo(() => {
    const s = new Set<number>();
    for (const [id, on] of Object.entries(expanded)) if (on) s.add(Number(id));
    return s;
  }, [expanded]);

  const flatRows = useMemo(
    () => flattenPickingRows(rows, expandedSet, paymentsByOrder),
    [rows, expandedSet, paymentsByOrder]
  );

  const goToPaymentView = (orderId: number, paymentId?: number) => {
    const q = new URLSearchParams({ mode: "view" });
    if (paymentId && paymentId > 0) q.set("paymentId", String(paymentId));
    router.push(`/admin/sales/order/${orderId}/payment?${q}`);
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={tPage("pageTitle")}
        description={tPage("pageSubtitle")}
      />

      <div className="flex w-full min-w-0 flex-wrap items-end gap-3">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          placeholder={tPage("searchPlaceholder")}
          className="min-w-0 flex-1"
        />
        <div className="w-full min-w-[14rem] max-w-[18rem] shrink-0">
          <DatePicker
            id="picking-date-range"
            mode="range"
            value={dateRange}
            onChange={(next) => {
              setDateRange(next);
              setPage(1);
            }}
            placeholder={tPage("filterDateRangePlaceholder")}
            aria-label={tPage("filterDateRange")}
            cancelLabel={tCrud("btn.cancel")}
            className="w-full"
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
              className={pickingStatusFilterButtonClass(st, active)}
              aria-pressed={active}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              <span
                className={cn(
                  pickingStatusPillClass(st, {
                    allFilterActive: st === "" && active,
                  }),
                  !active && "opacity-55 hover:opacity-100"
                )}
              >
                {tPage(`status.${st || "all"}`)} ({count})
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
              <TableHead>{tPage("columns.sku")}</TableHead>
              <TableHead>{tPage("columns.customer")}</TableHead>
              <TableHead>{tPage("columns.items")}</TableHead>
              <TableHead className="text-right tabular-nums">
                {tPage("columns.totalValue")}
              </TableHead>
              <TableHead className="text-center">{tPage("colStatus")}</TableHead>
              <TableHead className="text-center">
                {tPage("colCheckedBy")}
              </TableHead>
              <TableHead className="text-center">
                {tPage("colDocumentNumber")}
              </TableHead>
              <TableHead className="text-center">
                {tCrud("table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <CrudListTableSkeleton
                columnCount={COLUMN_COUNT + 1}
                rowCount={pageSize}
              />
            ) : flatRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT + 1} className="text-center">
                  {tPage("empty")}
                </TableCell>
              </TableRow>
            ) : (
              flatRows.map((row) => {
                if (row.kind === "payment") {
                  return (
                    <TableRow key={`payment-${row.id}`} className="bg-muted/30">
                      <TableCell />
                      <TableCell className="pl-6">
                        <div className="text-primary">
                          {row.sku || tPage("emptyCell")}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatDateTime(row.ordered_at, locale)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tPage("emptyCell")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tPage("emptyCell")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.total_price, locale)}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-muted-foreground text-center">
                        {tPage("emptyCell")}
                      </TableCell>
                      <TableCell className="text-center font-medium tabular-nums">
                        {row.sku || tPage("emptyCell")}
                      </TableCell>
                      <TableCell className="text-center">
                        {perms.view ? (
                          <TableIconActions
                            actions={["view"]}
                            onAction={() =>
                              goToPaymentView(row.orderId, row.id)
                            }
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                }

                const multi = row.payment_count > 1;
                const isOpen = expanded[row.id] === true;
                const editLocked =
                  row.status === "fail" || row.status === "success";
                const actions: TableIconActionKey[] = [];
                if (perms.view || perms.update) actions.push("view");
                if (perms.update && !editLocked) actions.push("edit");
                const checkedName = row.updated_by_name?.trim() ?? "";
                const showChecked =
                  row.status === "in_progress" || row.status === "success";
                const documentSku =
                  !multi && row.status === "success"
                    ? row.payment_sku?.trim() ?? ""
                    : "";

                return (
                  <TableRow key={`order-${row.id}`}>
                    <TableCell>
                      {multi ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="size-10 shrink-0 p-0"
                          aria-expanded={isOpen}
                          aria-label={tPage("ariaExpand")}
                          onClick={() => void toggleExpand(row)}
                        >
                          {isOpen ? (
                            <ChevronDown className="text-current" />
                          ) : (
                            <ChevronRight className="text-current" />
                          )}
                        </Button>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="text-primary">
                        {familySku(row.sku) || tPage("emptyCell")}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatDateTime(row.created_at, locale)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.member_name?.trim() || tPage("emptyCell")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>
                        {tPage("columns.itemLine", {
                          count: row.item_count.toLocaleString(),
                        })}
                      </div>
                      <div>
                        {tPage("columns.pieceLine", {
                          count: row.piece_count.toLocaleString(),
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.total_price, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={pickingStatusPillClass(row.status)}>
                        {tPage(`status.${row.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {showChecked && (checkedName || row.updated_at) ? (
                        <>
                          <div>{checkedName || tPage("emptyCell")}</div>
                          {row.updated_at ? (
                            <div className="text-muted-foreground text-xs">
                              {formatDateTime(row.updated_at, locale)}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          {tPage("emptyCell")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium tabular-nums">
                      {documentSku || (
                        <span className="text-muted-foreground font-normal">
                          {tPage("emptyCell")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {actions.length > 0 ? (
                        <TableIconActions
                          actions={actions}
                          onAction={(action) => {
                            if (action === "edit") {
                              router.push(`/admin/sales/order/${row.id}`);
                              return;
                            }
                            if (row.status === "success") {
                              goToPaymentView(row.id);
                              return;
                            }
                            router.push(
                              `/admin/sales/order/${row.id}?mode=view`
                            );
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
    </div>
  );
}
