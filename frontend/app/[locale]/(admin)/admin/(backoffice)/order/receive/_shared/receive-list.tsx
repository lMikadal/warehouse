"use client";

import { Building2, CheckCircle2, Clock, ShoppingCart, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import type { PurchaseListItem } from "@/lib/order-purchase-api";
import {
  fetchReceiveCount,
  fetchReceiveList,
  loadReceiveFilterOptions,
  OrderReceiveApiError,
  resolveReceiveFilterLabel,
  type ReceiveStatusFilter,
} from "@/lib/order-receive-api";
import { cn } from "@/lib/utils";

import { purchaseSummaryTotalExVat } from "../../purchase/_lib/purchase-totals";
import {
  RECEIVE_STATUS_FILTER_ORDER,
  receiveDisplayStatus,
  receiveStatusChipBadgeClass,
  receiveStatusChipClass,
  receiveStatusPillClass,
} from "./receive-status-styles";

const COLUMN_COUNT = 8;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** v1 receive list buttons: view always, receive unless the order is fully received or rejected. */
function rowActions(
  row: PurchaseListItem,
  perms: { view: boolean; update: boolean }
): TableIconActionKey[] {
  const actions: TableIconActionKey[] = [];
  if (perms.view) actions.push("view");
  if (perms.update && row.status !== "receive_completed") actions.push("edit");
  return actions;
}

export function ReceiveList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderReceive");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_receive");

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

  const [statusFilter, setStatusFilter] = useState<ReceiveStatusFilter>("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [supplierId, setSupplierId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PurchaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const dateFrom = dateRange?.from ?? undefined;
  const dateTo = dateRange?.to ?? undefined;

  const load = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const shared = {
        search: debouncedQuery,
        date_from: dateFrom,
        date_to: dateTo,
        supplier_user_id: supplierId || undefined,
        created_by: sellerId || undefined,
      };
      const [list, count] = await Promise.all([
        fetchReceiveList({
          ...shared,
          page,
          limit: pageSize,
          status: statusFilter || undefined,
        }),
        fetchReceiveCount(shared),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setTotalAll(count.count);
      setStatusCounts(count.by_status ?? {});
    } catch (e) {
      toast.error(
        e instanceof OrderReceiveApiError ? e.message : t("receiveOrderListFailed")
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
    supplierId,
    sellerId,
    t,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const statCards = useMemo(() => {
    const n = (key: string) => statusCounts[key] ?? 0;
    return [
      {
        key: "all",
        label: t("kpiTotal"),
        count: totalAll,
        icon: ShoppingCart,
        iconClass: "text-primary",
        bgClass: "bg-primary/10",
      },
      {
        key: "received",
        label: t("kpiReceived"),
        count: n("receive_completed"),
        icon: CheckCircle2,
        iconClass: "text-warehouse-success-fg",
        bgClass: "bg-warehouse-success-bg",
      },
      {
        key: "pending",
        label: t("kpiPendingReceive"),
        count: n("completed") + n("receive_partial"),
        icon: Clock,
        iconClass: "text-warehouse-warning-fg",
        bgClass: "bg-warehouse-warning-bg",
      },
      {
        key: "reject",
        label: t("kpiCancelled"),
        count: n("reject"),
        icon: XCircle,
        iconClass: "text-warehouse-error-fg",
        bgClass: "bg-warehouse-error-bg",
      },
    ] as const;
  }, [statusCounts, totalAll, t]);

  const statusChips = useMemo(
    () => [
      { value: "" as ReceiveStatusFilter, label: t("chipAll"), count: totalAll },
      ...RECEIVE_STATUS_FILTER_ORDER.map((value) => ({
        value,
        label:
          value === "completed"
            ? t("chipPurchaseCompleted")
            : value === "receive_partial"
              ? t("chipReceivePartial")
              : value === "receive_completed"
                ? t("chipReceiveCompleted")
                : t("chipReject"),
        count: statusCounts[value] ?? 0,
      })),
    ],
    [t, totalAll, statusCounts]
  );

  const statusLabel = (status: ReceiveStatusFilter) => {
    switch (status) {
      case "completed":
        return t("statusPurchaseCompleted");
      case "receive_partial":
        return t("statusReceivePartial");
      case "receive_completed":
        return t("statusReceiveCompleted");
      default:
        return t("statusReject");
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          placeholder={t("searchPlaceholder")}
        />
        <DatePicker
          id="receive-date-range"
          mode="range"
          value={dateRange}
          onChange={(next) => {
            setDateRange(next);
            setPage(1);
          }}
          placeholder={t("filterDateRangePlaceholder")}
          aria-label={t("filterDateRange")}
          confirmLabel={t("confirm")}
          cancelLabel={tCrud("btn.cancel")}
          className="w-full"
        />
        <RemoteComboboxField
          label={t("filterSupplierLabel")}
          value={supplierId}
          onValueChange={(v) => {
            setSupplierId(v);
            setPage(1);
          }}
          placeholder={t("filterSupplierLabelAll")}
          emptyLabel={tError("noData")}
          inputClassName="w-full"
          showClear
          onLoadOptions={(ctx) => loadReceiveFilterOptions("suppliers", ctx)}
          resolveSelectedLabel={(v) => resolveReceiveFilterLabel("suppliers", v)}
        />
        <RemoteComboboxField
          label={t("filterSeller")}
          value={sellerId}
          onValueChange={(v) => {
            setSellerId(v);
            setPage(1);
          }}
          placeholder={t("filterSellerAll")}
          emptyLabel={tError("noData")}
          inputClassName="w-full"
          showClear
          onLoadOptions={(ctx) => loadReceiveFilterOptions("sellers", ctx)}
          resolveSelectedLabel={(v) => resolveReceiveFilterLabel("sellers", v)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.key} className="shadow-none">
            <CardContent className="flex items-center gap-3 py-4">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-md",
                  card.bgClass
                )}
                aria-hidden
              >
                <card.icon className={cn("size-5", card.iconClass)} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-muted-foreground">
                  {card.label}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {card.count.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {t("kpiSubtitleUnit")}
                  </span>
                </span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {statusChips.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <Button
              key={chip.value || "all"}
              type="button"
              variant="outline"
              size="sm"
              className={receiveStatusChipClass(chip.value, active)}
              onClick={() => {
                setStatusFilter(chip.value);
                setPage(1);
              }}
            >
              {chip.label}
              <span className={receiveStatusChipBadgeClass(active)}>
                {chip.count}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colPurchaseNumber")}</TableHead>
              <TableHead className="text-center">{t("colUpdatedDate")}</TableHead>
              <TableHead className="min-w-[180px]">{t("colSupplier")}</TableHead>
              <TableHead className="text-right tabular-nums">
                {t("colTotalAmount")}
              </TableHead>
              <TableHead className="text-center">{t("colOrderer")}</TableHead>
              <TableHead className="text-center">
                {t("colPurchaseOrderDate")}
              </TableHead>
              <TableHead className="text-center">{t("colStatus")}</TableHead>
              <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <CrudListTableSkeleton
                columnCount={COLUMN_COUNT}
                rowCount={pageSize}
              />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="py-10 text-center text-muted-foreground"
                >
                  {t("emptyOrders")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const display = receiveDisplayStatus(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/admin/order/receive/${row.id}/detail`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {row.sku?.trim() || row.sku_draft?.trim() || t("emptyCell")}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDateTime(row.updated_at, locale)}
                    </TableCell>
                    <TableCell>
                      {row.supplier_name?.trim() || row.supplier_sku?.trim() ? (
                        <span className="flex items-start gap-2">
                          <Building2
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">
                              {row.supplier_name?.trim() || row.supplier_sku?.trim()}
                            </span>
                            {row.supplier_name?.trim() && row.supplier_sku?.trim() ? (
                              <span className="text-xs text-muted-foreground">
                                ({row.supplier_sku})
                              </span>
                            ) : null}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t("emptyCell")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(
                        purchaseSummaryTotalExVat(
                          row.total_price_discount,
                          row.total_grand_price
                        ),
                        locale
                      )}{" "}
                      {t("currencySuffix")}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.created_by_name?.trim() || t("emptyCell")}
                      {row.request_created_by_name?.trim()
                        ? ` / ${row.request_created_by_name.trim()}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDateTime(row.created_at, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex flex-col items-center gap-1">
                        <span className={receiveStatusPillClass(display)}>
                          {statusLabel(display)}
                        </span>
                        {(row.claim_reject_count ?? 0) > 0 ? (
                          <span className="text-[11px] font-medium text-warehouse-error-fg">
                            {t("claimNotice")}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <TableIconActions
                        actions={rowActions(row, perms)}
                        onAction={(action) => {
                          if (action === "view") {
                            router.push(`/admin/order/receive/${row.id}/detail`);
                          } else if (action === "edit") {
                            router.push(`/admin/order/receive/${row.id}`);
                          }
                        }}
                      />
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
