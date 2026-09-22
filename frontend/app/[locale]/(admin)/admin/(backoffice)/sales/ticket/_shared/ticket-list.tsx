"use client";

import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  Clock,
  Plus,
  Truck,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { Link, useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import {
  deleteTicket,
  fetchTicketCount,
  fetchTicketList,
  loadTicketFilterOptions,
  OrderTicketApiError,
  patchTicketStatus,
  resolveTicketFilterLabel,
  type TicketListItem,
} from "@/lib/order-ticket-api";
import { cn } from "@/lib/utils";

import {
  TICKET_STATUS_FILTER_ORDER,
  ticketStatusChipBadgeClass,
  ticketStatusChipClass,
  ticketStatusPillClass,
  type TicketStatusFilter,
} from "./ticket-status-styles";

const COLUMN_COUNT = 9;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** v1 row buttons: view always, edit on draft, cancel on pending, delete always. */
function rowActions(
  row: TicketListItem,
  perms: { view: boolean; update: boolean; delete: boolean }
): TableIconActionKey[] {
  const actions: TableIconActionKey[] = [];
  if (perms.view) actions.push("view");
  if (perms.update && row.status === "draft") actions.push("edit");
  if (perms.update && row.status === "pending") actions.push("cancel");
  if (perms.delete) actions.push("delete");
  return actions;
}

export function TicketList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderTicket");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_ticket");

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

  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [sellerId, setSellerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<TicketListItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TicketListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);

  const dateFrom = dateRange?.from ? `${dateRange.from}T00:00:00.000Z` : undefined;
  const dateTo = dateRange?.to ? `${dateRange.to}T23:59:59.999Z` : undefined;

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
        created_by: sellerId || undefined,
      };
      const [list, count] = await Promise.all([
        fetchTicketList({
          ...shared,
          page,
          limit: pageSize,
          status: statusFilter || undefined,
        }),
        fetchTicketCount(shared),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setTotalAll(count.count);
      setStatusCounts(count.by_status ?? {});
      setItemCounts(count.by_item_status ?? {});
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("loadFailed")
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
    sellerId,
    tError,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const statCards = useMemo(() => {
    const approvedPipeline =
      (statusCounts.approved ?? 0) +
      (statusCounts.received ?? 0) +
      (statusCounts.completed ?? 0);
    return [
      {
        key: "all",
        label: tPage("statAll"),
        count: totalAll,
        icon: ClipboardList,
        iconClass: "text-primary",
        bgClass: "bg-primary/10",
        productUnit: false,
      },
      {
        key: "pending",
        label: tPage("statPending"),
        count: statusCounts.pending ?? 0,
        icon: Clock,
        iconClass: "text-warehouse-warning-fg",
        bgClass: "bg-warehouse-warning-bg",
        productUnit: false,
      },
      {
        key: "approved",
        label: tPage("statApproved"),
        count: approvedPipeline,
        icon: CheckCircle2,
        iconClass: "text-warehouse-success-fg",
        bgClass: "bg-warehouse-success-bg",
        productUnit: false,
      },
      {
        key: "rejected",
        label: tPage("statRejected"),
        count: itemCounts.rejected ?? 0,
        icon: Truck,
        iconClass: "text-warehouse-error-fg",
        bgClass: "bg-warehouse-error-bg",
        productUnit: true,
      },
      {
        key: "cancelled",
        label: tPage("statCancelled"),
        count: itemCounts.cancelled ?? 0,
        icon: CalendarX,
        iconClass: "text-warehouse-status-inactive-fg",
        bgClass: "bg-warehouse-status-inactive-bg",
        productUnit: true,
      },
    ] as const;
  }, [totalAll, statusCounts, itemCounts, tPage]);

  const statusChips = useMemo(
    () => [
      { value: "" as TicketStatusFilter, label: tPage("statusAll"), count: totalAll },
      ...TICKET_STATUS_FILTER_ORDER.map((value) => ({
        value: value as TicketStatusFilter,
        label: tPage(`status.${value}`),
        count: statusCounts[value] ?? 0,
      })),
    ],
    [tPage, totalAll, statusCounts]
  );

  const confirmCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setBusy(true);
    try {
      await patchTicketStatus(locale, cancelTarget.id, "cancelled");
      toast.success(tCrud("toast.saved"));
      setCancelTarget(null);
      setCancelReason("");
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTicket(locale, deleteTarget.id);
      toast.success(tCrud("toast.deleted"));
      setDeleteTarget(null);
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("deleteFailed")
      );
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("subtitle")}
        actions={
          perms.create ? (
            <Button asChild>
              <Link href="/admin/sales/ticket/new">
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
        <div className="w-full min-w-[14rem] max-w-[20rem] shrink-0 sm:w-auto">
          <DatePicker
            id="ticket-date-range"
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
        <div className="min-w-48 w-full flex-1 sm:w-auto">
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
            onLoadOptions={(ctx) => loadTicketFilterOptions("", ctx)}
            resolveSelectedLabel={(v) => resolveTicketFilterLabel("", v)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                      {card.productUnit
                        ? tPage("statItemsProduct")
                        : tPage("statItems")}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
              className={ticketStatusChipClass(chip.value, active)}
              onClick={() => {
                setStatusFilter(chip.value);
                setPage(1);
              }}
            >
              {chip.label}
              <span className={ticketStatusChipBadgeClass(active)}>
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
              <TableHead className="text-center tabular-nums">#</TableHead>
              <TableHead>{tPage("colSku")}</TableHead>
              <TableHead className="text-center">{tPage("colCreatedAt")}</TableHead>
              <TableHead>{tPage("colCustomer")}</TableHead>
              <TableHead className="text-center">{tPage("colTotalQty")}</TableHead>
              <TableHead className="text-center">{tPage("colSeller")}</TableHead>
              <TableHead className="text-right tabular-nums">
                {tPage("colTotalDeposit")}
              </TableHead>
              <TableHead className="text-center">{tPage("colStatus")}</TableHead>
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
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const allRejected =
                  row.total_qty > 0 && row.rejected_item_count === row.total_qty;
                const statusSuffix =
                  row.status === "approved"
                    ? row.approved_item_count
                    : row.status === "received"
                      ? row.received_item_count
                      : row.status === "completed"
                        ? row.completed_item_count
                        : 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-center tabular-nums">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/sales/ticket/${row.id}/detail`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.sku?.trim() || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDateTime(row.created_at, locale)}
                    </TableCell>
                    <TableCell>{row.customer_name?.trim() || "—"}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span
                          className={cn(
                            "tabular-nums",
                            allRejected &&
                              "font-medium text-warehouse-error-fg"
                          )}
                        >
                          {row.total_qty}
                        </span>
                        {row.rejected_item_count > 0 ? (
                          <Badge
                            variant="secondary"
                            className={ticketStatusPillClass("rejected")}
                          >
                            <AlertTriangle className="size-3 shrink-0" aria-hidden />
                            {tPage("badgeRejectedLines", {
                              count: row.rejected_item_count,
                            })}
                          </Badge>
                        ) : null}
                        {row.cancelled_item_count > 0 ? (
                          <Badge
                            variant="secondary"
                            className={ticketStatusPillClass("cancelled")}
                          >
                            <CalendarX className="size-3 shrink-0" aria-hidden />
                            {tPage("badgeCancelledLines", {
                              count: row.cancelled_item_count,
                            })}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.created_by_name?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.total_deposit, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={ticketStatusPillClass(row.status)}>
                        {tPage(`status.${row.status}`)}
                        {statusSuffix > 0 ? ` (${statusSuffix})` : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {row.pending_item_reject_count > 0 ? (
                          <AlertTriangle
                            className="size-4 shrink-0 text-destructive"
                            aria-label={tPage("badgePendingRejects", {
                              count: row.pending_item_reject_count,
                            })}
                          />
                        ) : null}
                        <TableIconActions
                          actions={rowActions(row, perms)}
                          onAction={(action) => {
                            if (action === "cancel") {
                              setCancelTarget(row);
                              setCancelReason("");
                              return;
                            }
                            if (action === "delete") {
                              setDeleteTarget(row);
                              return;
                            }
                            router.push(
                              action === "edit"
                                ? `/admin/sales/ticket/${row.id}`
                                : `/admin/sales/ticket/${row.id}/detail`
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
        title={tPage("deleteDialog.title")}
        description={tPage("deleteDialog.description", {
          sku: deleteTarget?.sku ?? "",
        })}
        onConfirm={() => void confirmDelete()}
      />

      <Dialog
        open={cancelTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tPage("cancelDialog.title")}</DialogTitle>
            <DialogDescription>
              {tPage("cancelDialog.description", {
                sku: cancelTarget?.sku ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="ticket-cancel-reason">
              {tPage("cancelDialog.reason")}
            </Label>
            <Textarea
              id="ticket-cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={tPage("cancelDialog.reasonPlaceholder")}
              disabled={busy}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(null)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={busy || !cancelReason.trim()}
              onClick={() => void confirmCancel()}
            >
              {tPage("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
