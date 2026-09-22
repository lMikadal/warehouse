"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  deleteStoreClaim,
  fetchStoreClaimCount,
  fetchStoreClaimList,
  OrderStoreClaimApiError,
  type StoreClaimListItem,
  type StoreClaimStatusFilter,
} from "@/lib/order-store-claim-api";

import {
  STORE_CLAIM_STATUS_ORDER,
  storeClaimStatusChipBadgeClass,
  storeClaimStatusChipClass,
  storeClaimStatusPillClass,
} from "./store-claim-status-styles";

const COLUMN_COUNT = 8;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function StoreClaimList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderStoreClaimList");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_store_claim_list");

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

  const [statusFilter, setStatusFilter] = useState<StoreClaimStatusFilter>("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StoreClaimListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<StoreClaimListItem | null>(null);

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
        type: typeFilter || undefined,
        date_from: dateFrom,
        date_to: dateTo,
      };
      const [list, count] = await Promise.all([
        fetchStoreClaimList({
          ...shared,
          page,
          limit: pageSize,
          status: statusFilter || undefined,
        }),
        fetchStoreClaimCount(shared),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setTotalAll(count.count);
      setStatusCounts(count.by_status ?? {});
    } catch (e) {
      toast.error(
        e instanceof OrderStoreClaimApiError ? e.message : tPage("loadFailed")
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
    typeFilter,
    dateFrom,
    dateTo,
    tPage,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStoreClaim(deleteTarget.id);
      toast.success(tPage("deleteSuccess"));
      setDeleteTarget(null);
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderStoreClaimApiError ? e.message : tPage("deleteFailed")
      );
    }
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

      <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          placeholder={tPage("searchPlaceholder")}
        />
        <DatePicker
          id="store-claim-list-date-range"
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
        <div className="grid gap-1.5">
          <Label htmlFor="store-claim-list-type">{tPage("filterClaimType")}</Label>
          <Select
            value={typeFilter || "all"}
            onValueChange={(v) => {
              setTypeFilter(!v || v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger id="store-claim-list-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tPage("type.all")}</SelectItem>
              <SelectItem value="claim">{tPage("type.claim")}</SelectItem>
              <SelectItem value="return">{tPage("type.return")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STORE_CLAIM_STATUS_ORDER.map((status) => {
          const active = statusFilter === status;
          const count = status === "" ? totalAll : statusCounts[status] ?? 0;
          return (
            <Button
              key={status || "all"}
              type="button"
              variant="outline"
              size="sm"
              className={storeClaimStatusChipClass(status, active)}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
            >
              {tPage(`status.${status || "all"}`)}
              <span className={storeClaimStatusChipBadgeClass(active)}>
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tPage("columns.documentNo")}</TableHead>
              <TableHead className="text-center">
                {tPage("columns.documentDate")}
              </TableHead>
              <TableHead>{tPage("columns.orderNo")}</TableHead>
              <TableHead className="text-center">{tPage("columns.type")}</TableHead>
              <TableHead>{tPage("columns.requester")}</TableHead>
              <TableHead className="text-right">
                {tPage("columns.totalPrice")}
              </TableHead>
              <TableHead className="text-center">
                {tPage("columns.status")}
              </TableHead>
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
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="text-muted-foreground py-10 text-center"
                >
                  {tPage("empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                // Returns may be edited on the payment form while pending; claims are view-only here.
                const open = row.status === "pending";
                const actions: TableIconActionKey[] = [];
                if (perms.view) actions.push("view");
                if (perms.update && open && row.type === "return") {
                  actions.push("edit");
                }
                if (perms.delete && open) actions.push("delete");
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-primary font-medium tabular-nums">
                      {row.sku?.trim() || tPage("emptyCell")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center">
                      {formatDateTime(row.created_at, locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {row.payment_sku?.trim() || tPage("emptyCell")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center">
                      {tPage(`type.${row.type}`)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.member_name?.trim() || tPage("emptyCell")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.total_price, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={storeClaimStatusPillClass(row.status)}>
                        {tPage(`status.${row.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {actions.length > 0 ? (
                        <TableIconActions
                          actions={actions}
                          onAction={(action) => {
                            if (action === "delete") {
                              setDeleteTarget(row);
                              return;
                            }
                            if (row.type === "claim" && action === "view") {
                              router.push(
                                `/admin/sales/store-claim-list/${row.id}`,
                              );
                              return;
                            }
                            router.push(
                              `/admin/sales/store-claim/${row.order_payment_id}`,
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

      <CrudDeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
