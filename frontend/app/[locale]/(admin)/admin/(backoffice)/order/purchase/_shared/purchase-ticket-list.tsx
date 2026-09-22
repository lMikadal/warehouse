"use client";

import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  Clock,
  Truck,
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
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import {
  deleteTicket,
  fetchTicketCount,
  fetchTicketList,
  loadTicketFilterOptions,
  OrderTicketApiError,
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
} from "../../../sales/ticket/_shared/ticket-status-styles";

const COLUMN_COUNT = 8;

/**
 * v1 purchase-side rules: view only once the request already has a PO to look at, and edit is closed
 * once the request is approved or every line has been turned into a PO.
 */
function rowActions(
  row: TicketListItem,
  perms: { view: boolean; update: boolean; delete: boolean }
): { actions: TableIconActionKey[]; disabled: TableIconActionKey[] } {
  const actions: TableIconActionKey[] = [];
  const disabled: TableIconActionKey[] = [];
  if (perms.view) {
    actions.push("view");
    if (row.purchase_order_count <= 0) disabled.push("view");
  }
  if (perms.update) {
    actions.push("edit");
    if (row.status === "approved" || row.all_items_have_po) disabled.push("edit");
  }
  if (perms.delete) actions.push("delete");
  return { actions, disabled };
}

/** The purchase side never shows drafts: those still belong to the sales request author. */
export function PurchaseTicketList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tTicket = useTranslations("page.orderTicket");
  const tPo = useTranslations("page.orderPurchase.po");
  const tConfirm = useTranslations("page.orderPurchase");
  const tTicketTab = useTranslations("page.orderPurchase.ticket");
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
  const [itemStatusCounts, setItemStatusCounts] = useState<
    Record<string, number>
  >({});
  const [deleteTarget, setDeleteTarget] = useState<TicketListItem | null>(null);

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
        created_by: sellerId || undefined,
        exclude_draft: true,
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
      setItemStatusCounts(count.by_item_status ?? {});
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
    const n = (key: string) => statusCounts[key] ?? 0;
    return [
      {
        key: "all",
        label: tTicketTab("statAll"),
        count: totalAll,
        icon: ClipboardList,
        iconClass: "text-primary",
        bgClass: "bg-primary/10",
        unit: tTicketTab("statItems"),
      },
      {
        key: "pending",
        label: tTicket("status.pending"),
        count: n("pending"),
        icon: Clock,
        iconClass: "text-warehouse-warning-fg",
        bgClass: "bg-warehouse-warning-bg",
        unit: tTicketTab("statItems"),
      },
      {
        key: "approved",
        label: tTicket("status.approved"),
        count: n("approved") + n("received") + n("completed"),
        icon: CheckCircle2,
        iconClass: "text-warehouse-success-fg",
        bgClass: "bg-warehouse-success-bg",
        unit: tTicketTab("statItems"),
      },
      {
        key: "rejected",
        label: tTicket("status.rejected"),
        count: itemStatusCounts.rejected ?? 0,
        icon: Truck,
        iconClass: "text-warehouse-error-fg",
        bgClass: "bg-warehouse-error-bg",
        unit: tTicketTab("statItemsProduct"),
      },
      {
        key: "cancelled",
        label: tTicket("status.cancelled"),
        count: itemStatusCounts.cancelled ?? 0,
        icon: CalendarX,
        iconClass: "text-warehouse-status-inactive-fg",
        bgClass: "bg-warehouse-status-inactive-bg",
        unit: tTicketTab("statItemsProduct"),
      },
    ] as const;
  }, [statusCounts, itemStatusCounts, totalAll, tTicketTab, tTicket]);

  const statusChips = useMemo(
    () => [
      { value: "" as TicketStatusFilter, label: tCrud("filter.all"), count: totalAll },
      // "draft" never reaches the purchase side, so it is dropped from the chip row.
      ...TICKET_STATUS_FILTER_ORDER.filter((v) => v !== "draft").map((value) => ({
        value: value as TicketStatusFilter,
        label: tTicket(`status.${value}`),
        count: statusCounts[value] ?? 0,
      })),
    ],
    [tCrud, tTicket, totalAll, statusCounts]
  );

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
      <div className="flex w-full min-w-0 flex-wrap items-end gap-3">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          placeholder={tTicketTab("searchPlaceholder")}
          className="min-w-0 flex-1"
        />
        <div className="min-w-48 w-full flex-1 sm:w-auto">
          <RemoteComboboxField
            label={tTicketTab("filterSeller")}
            value={sellerId}
            onValueChange={(v) => {
              setSellerId(v);
              setPage(1);
            }}
            placeholder={tTicketTab("filterSellerAll")}
            emptyLabel={tError("noData")}
            showClear
            inputClassName="w-full min-w-0"
            onLoadOptions={(ctx) => loadTicketFilterOptions("sellers", ctx)}
            resolveSelectedLabel={(v) => resolveTicketFilterLabel("sellers", v)}
          />
        </div>
        <div className="w-full min-w-[14rem] max-w-[20rem] shrink-0 sm:w-auto">
          <DatePicker
            id="purchase-ticket-date-range"
            mode="range"
            value={dateRange}
            onChange={(next) => {
              setDateRange(next);
              setPage(1);
            }}
            placeholder={tPo("filterDateRangePlaceholder")}
            aria-label={tPo("filterDateRange")}
            confirmLabel={tConfirm("confirm")}
            cancelLabel={tCrud("btn.cancel")}
            className="w-full"
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
                      {card.unit}
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
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>{tTicketTab("colTicketNumber")}</TableHead>
              <TableHead className="text-center">{tTicketTab("colCreatedAt")}</TableHead>
              <TableHead className="text-center">{tTicketTab("colTotalQty")}</TableHead>
              <TableHead className="text-center">{tTicketTab("colSeller")}</TableHead>
              <TableHead className="text-right tabular-nums">
                {tTicketTab("colTotalDeposit")}
              </TableHead>
              <TableHead className="text-center">{tTicketTab("colStatus")}</TableHead>
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
                <TableCell colSpan={COLUMN_COUNT} className="text-center">
                  {tTicketTab("emptyTickets")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const { actions, disabled } = rowActions(row, perms);
                const allRejected =
                  row.total_qty > 0 && row.rejected_item_count === row.total_qty;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-center tabular-nums">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {row.sku || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDateTime(row.created_at, locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span
                          className={cn(
                            "tabular-nums",
                            allRejected && "font-medium text-warehouse-error-fg"
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
                            {tTicketTab("qtyBadgeRejected", {
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
                            {tTicketTab("qtyBadgeCancelled", {
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
                      {row.total_deposit.toLocaleString(
                        locale === "th" ? "th-TH" : "en-US",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={ticketStatusPillClass(row.status)}>
                        {tTicket(`status.${row.status}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        <TableIconActions
                          actions={actions}
                          disabledActions={disabled}
                          onAction={(action) => {
                            if (action === "delete") {
                              setDeleteTarget(row);
                              return;
                            }
                            if (action === "edit") {
                              router.push(
                                `/admin/order/purchase/ticket/${row.id}`
                              );
                              return;
                            }
                            router.push(
                              `/admin/order/purchase/ticket/${row.id}/detail`
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
        title={tTicketTab("confirmDeleteTitle")}
        description={tTicketTab("confirmDeleteDescription", {
          ticketNumber: deleteTarget?.sku || "",
        })}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
