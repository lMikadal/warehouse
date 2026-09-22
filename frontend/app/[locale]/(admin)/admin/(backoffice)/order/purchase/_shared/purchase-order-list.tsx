"use client";

import {
  Building2,
  CalendarX,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Truck,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker, type DateRangeValue } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  deletePurchase,
  fetchPurchaseCount,
  fetchPurchaseList,
  loadPurchaseFilterOptions,
  OrderPurchaseApiError,
  PURCHASE_ORDERED_STATUS_FILTER,
  resolvePurchaseFilterLabel,
  type PurchaseListItem,
} from "@/lib/order-purchase-api";
import { cn } from "@/lib/utils";

import { purchaseSummaryTotalExVat } from "../_lib/purchase-totals";
import {
  PURCHASE_STATUS_FILTER_ORDER,
  purchaseStatusChipBadgeClass,
  purchaseStatusChipClass,
  purchaseStatusPillClass,
  type PurchaseStatusFilter,
} from "./purchase-status-styles";

const COLUMN_COUNT = 9;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Blank or a negative number clears the filter rather than sending garbage to the API. */
function parseAmount(raw: string): string {
  const cleaned = raw.trim().replace(/,/g, "");
  if (!cleaned) return "";
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(n);
}

/** v1 list buttons: view always; edit on draft/revision/pending; pay on paying; delete unless ordered. */
function rowActions(
  row: PurchaseListItem,
  perms: { view: boolean; update: boolean; delete: boolean }
): TableIconActionKey[] {
  const actions: TableIconActionKey[] = [];
  if (perms.view) actions.push("view");
  if (
    perms.update &&
    (row.status === "draft" ||
      row.status === "rejected" ||
      row.status === "pending")
  ) {
    actions.push("edit");
  }
  if (perms.update && row.status === "paying") actions.push("pay");
  const receiptStarted =
    row.status === "receive_partial" || row.status === "receive_completed";
  if (
    perms.delete &&
    row.status !== "cancelled" &&
    row.status !== "completed" &&
    !receiptStarted
  ) {
    actions.push("delete");
  }
  return actions;
}

export type PurchaseOrderListProps = {
  /** Bump from the parent (refill tab creating a PO) to refetch rows and KPI counts. */
  refreshEpoch?: number;
  /** A draft PO flagged is_waiting belongs to the refill tab, not the edit form. */
  onOpenWaitingDraft?: (purchaseId: number) => void;
};

export function PurchaseOrderList({
  refreshEpoch = 0,
  onOpenWaitingDraft,
}: PurchaseOrderListProps) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPurchase");
  const tPo = useTranslations("page.orderPurchase.po");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_purchase");

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

  const [statusFilter, setStatusFilter] = useState<PurchaseStatusFilter>("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [supplierId, setSupplierId] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [amountRange, setAmountRange] = useState({ min: "", max: "" });
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PurchaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [sums, setSums] = useState({ exVat: 0, vat: 0, debt: 0 });
  const [deleteTarget, setDeleteTarget] = useState<PurchaseListItem | null>(null);

  // The amount inputs are free text, so debounce them the way v1 did before querying.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAmountRange({ min: parseAmount(amountMin), max: parseAmount(amountMax) });
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [amountMin, amountMax, setPage]);

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
        grand_total_min: amountRange.min || undefined,
        grand_total_max: amountRange.max || undefined,
      };
      const [list, count] = await Promise.all([
        fetchPurchaseList({
          ...shared,
          page,
          limit: pageSize,
          status: statusFilter || undefined,
        }),
        fetchPurchaseCount(shared),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setTotalAll(count.count);
      setStatusCounts(count.by_status ?? {});
      setSums({
        exVat: count.sum_total_ex_vat ?? 0,
        vat: count.sum_total_vat ?? 0,
        debt: count.sum_outstanding_debt ?? 0,
      });
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("loadFailed")
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
    amountRange.min,
    amountRange.max,
    tError,
  ]);

  useEffect(() => {
    void load();
  }, [load, refreshEpoch]);

  const orderedCount = useMemo(
    () =>
      (statusCounts.completed ?? 0) +
      (statusCounts.receive_partial ?? 0) +
      (statusCounts.receive_completed ?? 0),
    [statusCounts]
  );

  const statCards = useMemo(() => {
    const n = (key: string) => statusCounts[key] ?? 0;
    return [
      {
        key: "all",
        label: tPo("kpiTotalPo"),
        count: totalAll,
        icon: FileText,
        iconClass: "text-primary",
        bgClass: "bg-primary/10",
      },
      {
        key: "pipeline",
        label: tPo("kpiPendingPipeline"),
        count: n("draft") + n("pending") + n("paying") + n("rejected"),
        icon: Clock,
        iconClass: "text-warehouse-warning-fg",
        bgClass: "bg-warehouse-warning-bg",
      },
      {
        key: "waiting",
        label: tPo("kpiWaitingReceipt"),
        count: n("completed"),
        icon: Truck,
        iconClass: "text-primary",
        bgClass: "bg-primary/15",
      },
      {
        key: "done",
        label: tPo("kpiDoneReceive"),
        count: n("receive_completed") + n("receive_partial"),
        icon: CheckCircle2,
        iconClass: "text-warehouse-success-fg",
        bgClass: "bg-warehouse-success-bg",
      },
      {
        key: "cancelled",
        label: tPo("kpiCancelledShort"),
        count: n("cancelled"),
        icon: CalendarX,
        iconClass: "text-warehouse-error-fg",
        bgClass: "bg-warehouse-error-bg",
      },
    ] as const;
  }, [statusCounts, totalAll, tPo]);

  const statusChips = useMemo(
    () => [
      { value: "" as PurchaseStatusFilter, label: tPo("chipAll"), count: totalAll },
      ...PURCHASE_STATUS_FILTER_ORDER.map((value) => ({
        value,
        label:
          value === PURCHASE_ORDERED_STATUS_FILTER
            ? tPo("chipCompleted")
            : tPage(`status.${value}`),
        count:
          value === PURCHASE_ORDERED_STATUS_FILTER
            ? orderedCount
            : (statusCounts[value] ?? 0),
      })),
    ],
    [tPo, tPage, totalAll, statusCounts, orderedCount]
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePurchase(locale, deleteTarget.id);
      toast.success(tCrud("toast.deleted"));
      setDeleteTarget(null);
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("deleteFailed")
      );
    }
  };

  /** v1 getPurchaseDisplayNumber: real PO number once issued, otherwise the draft number. */
  const displayNumber = (row: PurchaseListItem) =>
    row.sku?.trim() || row.sku_draft?.trim() || "—";

  const openRow = (row: PurchaseListItem) => {
    if (row.is_waiting && row.status === "draft" && onOpenWaitingDraft) {
      onOpenWaitingDraft(row.id);
      return;
    }
    router.push(`/admin/order/purchase/${row.id}/detail`);
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex w-full min-w-0 flex-wrap items-end gap-3">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          placeholder={tPo("searchPlaceholder")}
          className="min-w-0 flex-1"
        />
        <div className="min-w-48 w-full flex-1 sm:w-auto">
          <RemoteComboboxField
            label={tPo("filterSupplier")}
            value={supplierId}
            onValueChange={(v) => {
              setSupplierId(v);
              setPage(1);
            }}
            placeholder={tPo("filterSupplierAll")}
            emptyLabel={tError("noData")}
            showClear
            inputClassName="w-full min-w-0"
            onLoadOptions={(ctx) => loadPurchaseFilterOptions("suppliers", ctx)}
            resolveSelectedLabel={(v) =>
              resolvePurchaseFilterLabel("suppliers", v)
            }
          />
        </div>
        <div className="w-full min-w-[14rem] max-w-[20rem] shrink-0 sm:w-auto">
          <DatePicker
            id="purchase-date-range"
            mode="range"
            value={dateRange}
            onChange={(next) => {
              setDateRange(next);
              setPage(1);
            }}
            placeholder={tPo("filterDateRangePlaceholder")}
            aria-label={tPo("filterDateRange")}
            confirmLabel={tPage("confirm")}
            cancelLabel={tCrud("btn.cancel")}
            className="w-full"
          />
        </div>
        <div className="grid min-w-[14rem] gap-1.5">
          <Label htmlFor="purchase-amount-min">{tPo("filterAmountRange")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="purchase-amount-min"
              inputMode="decimal"
              className="min-w-0 flex-1"
              placeholder={tPo("filterAmountMin")}
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
            />
            <span className="shrink-0 text-muted-foreground">–</span>
            <Input
              aria-label={tPo("filterAmountMax")}
              inputMode="decimal"
              className="min-w-0 flex-1"
              placeholder={tPo("filterAmountMax")}
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-md",
                    card.bgClass
                  )}
                >
                  <Icon className={cn("size-6", card.iconClass)} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-xl font-bold leading-tight tabular-nums text-foreground">
                    {card.count.toLocaleString()}
                    <span className="ml-1 whitespace-nowrap text-xs font-normal text-muted-foreground">
                      {tPo("kpiSubtitlePoUnit")}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Wallet className="size-6 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {tPo("kpiTotalValueTitle")}
                </p>
                <p className="text-xl font-bold leading-tight tabular-nums text-foreground">
                  {money(sums.exVat, locale)}
                </p>
              </div>
            </div>
            <p className="border-t pt-2 text-xs text-muted-foreground">
              {tPage("currencySuffix")} {tPo("kpiTotalValueExVatHint")} ·{" "}
              {tPo("kpiTotalVatFooter")}{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {money(sums.vat, locale)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-warehouse-warning-bg">
              <CreditCard
                className="size-6 text-warehouse-warning-fg"
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">
                {tPo("kpiDebtTitle")}
              </p>
              <p className="text-xl font-bold leading-tight tabular-nums text-foreground">
                {money(sums.debt, locale)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {tPage("currencySuffix")}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusChips.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <Button
              key={chip.value || "__all"}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={active}
              className={purchaseStatusChipClass(chip.value, active)}
              onClick={() => {
                setStatusFilter(chip.value);
                setPage(1);
              }}
            >
              {chip.label}
              <span className={purchaseStatusChipBadgeClass(active)}>
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
              <TableHead>{tPo("colPurchaseNumber")}</TableHead>
              <TableHead className="text-center">{tPo("colOrderDate")}</TableHead>
              <TableHead className="min-w-[200px]">
                {tPo("colSupplier")}
              </TableHead>
              <TableHead className="text-right tabular-nums">
                {tPo("colTotalAmount")}
              </TableHead>
              <TableHead className="text-center">
                {tPo("colUpdatedDate")}
              </TableHead>
              <TableHead className="text-center">
                {tPo("colCancelledLines")}
              </TableHead>
              <TableHead className="text-center">{tPo("colOrderer")}</TableHead>
              <TableHead className="text-center">{tPo("colStatus")}</TableHead>
              <TableHead className="text-center">
                {tCrud("table.actions")}
              </TableHead>
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
                <TableCell colSpan={COLUMN_COUNT} className="text-center">
                  {tPo("emptyOrders")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const number = displayNumber(row);
                const draftRef = row.sku_draft?.trim() ?? "";
                const supplier = row.supplier_name?.trim() ?? "";
                const supplierSku = row.supplier_sku?.trim() ?? "";
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex flex-col items-start gap-0.5">
                        <button
                          type="button"
                          className="text-left font-medium text-primary hover:underline"
                          onClick={() => openRow(row)}
                        >
                          {number}
                        </button>
                        {draftRef && draftRef !== number ? (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {draftRef}
                          </span>
                        ) : null}
                        {row.purchase_request_sku?.trim() ? (
                          <Link
                            href={`/admin/sales/ticket/${row.purchase_request_id}/detail`}
                            className="text-xs text-muted-foreground underline hover:text-primary"
                          >
                            {row.purchase_request_sku}
                          </Link>
                        ) : null}
                        {row.is_waiting ? (
                          <Badge
                            variant="secondary"
                            className={purchaseStatusPillClass("pending")}
                          >
                            {tPo("refillBadge")}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDateTime(row.created_at, locale)}
                    </TableCell>
                    <TableCell>
                      {supplier || supplierSku ? (
                        <div className="flex items-start gap-2">
                          <Building2
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate">
                              {supplier || supplierSku}
                            </span>
                            {supplier && supplierSku ? (
                              <span className="text-xs text-muted-foreground">
                                ({supplierSku})
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {tPo("emptySupplierCell")}
                        </span>
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
                      {tPage("currencySuffix")}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDateTime(row.updated_at, locale)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-center tabular-nums",
                        row.item_reject_count > 0 &&
                          "font-medium text-warehouse-error-fg"
                      )}
                    >
                      {row.item_reject_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.created_by_name?.trim() || "—"}
                      {row.request_created_by_name?.trim()
                        ? ` / ${row.request_created_by_name.trim()}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={purchaseStatusPillClass(row.status)}>
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-current opacity-90"
                          aria-hidden
                        />
                        {tPage(`status.${row.status}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        <TableIconActions
                          actions={rowActions(row, perms)}
                          onAction={(action) => {
                            if (action === "delete") {
                              setDeleteTarget(row);
                              return;
                            }
                            if (action === "pay") {
                              router.push(
                                `/admin/order/purchase/${row.id}/payment`
                              );
                              return;
                            }
                            if (action === "edit") {
                              if (row.is_waiting && onOpenWaitingDraft) {
                                onOpenWaitingDraft(row.id);
                                return;
                              }
                              router.push(`/admin/order/purchase/${row.id}`);
                              return;
                            }
                            router.push(
                              `/admin/order/purchase/${row.id}/detail`
                            );
                          }}
                        />
                      </div>
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
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={tPo("confirmDeletePOTitle")}
        description={tPo("confirmDeletePODescription", {
          purchaseNumber: deleteTarget ? displayNumber(deleteTarget) : "",
        })}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
