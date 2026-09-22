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
  deleteSalesClaim,
  fetchSalesClaimCount,
  fetchSalesClaimList,
  OrderSalesClaimApiError,
} from "@/lib/order-sales-claim-api";
import type {
  StoreClaimListItem,
  StoreClaimStatusFilter,
} from "@/lib/order-store-claim-api";

// The sales desk and the purchasing desk read the same order_claim workflow, so they share its tones.
import {
  STORE_CLAIM_STATUS_ORDER,
  storeClaimStatusChipBadgeClass,
  storeClaimStatusChipClass,
  storeClaimStatusPillClass,
} from "../../../sales/store-claim-list/_shared/store-claim-status-styles";

const COLUMN_COUNT = 6;

/** Purchasing's queue of claims the sales floor filed, driven by order_claim_status. */
export function SalesClaimList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderSalesClaim");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_sales_claim");

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
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StoreClaimListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<StoreClaimListItem | null>(
    null,
  );

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
      };
      const [list, count] = await Promise.all([
        fetchSalesClaimList({
          ...shared,
          page,
          limit: pageSize,
          status: statusFilter || undefined,
        }),
        fetchSalesClaimCount(shared),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setTotalAll(count.count);
      setStatusCounts(count.by_status ?? {});
    } catch (e) {
      toast.error(
        e instanceof OrderSalesClaimApiError ? e.message : tPage("loadFailed"),
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSalesClaim(deleteTarget.id);
      toast.success(tPage("deleteSuccess"));
      setDeleteTarget(null);
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderSalesClaimApiError
          ? e.message
          : tPage("deleteFailed"),
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

      <div className="grid items-end gap-3 md:grid-cols-2">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          placeholder={tPage("searchPlaceholder")}
        />
        <DatePicker
          id="sales-claim-date-range"
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

      <div className="flex flex-wrap gap-2">
        {STORE_CLAIM_STATUS_ORDER.map((status) => {
          const active = statusFilter === status;
          const count = status === "" ? totalAll : (statusCounts[status] ?? 0);
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
              <TableHead>{tPage("columns.requester")}</TableHead>
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
                // Purchasing may still throw out a claim nobody has picked up yet.
                const untouched = row.status === "pending";
                const actions: TableIconActionKey[] = ["view"];
                if (perms.update) actions.push("edit");
                if (perms.delete && untouched) actions.push("delete");
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
                    <TableCell className="text-muted-foreground">
                      {row.member_name?.trim() || tPage("emptyCell")}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={storeClaimStatusPillClass(row.status)}>
                        {tPage(`status.${row.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <TableIconActions
                        actions={actions}
                        onAction={(action) => {
                          if (action === "delete") {
                            setDeleteTarget(row);
                            return;
                          }
                          router.push(
                            action === "edit"
                              ? `/admin/order/sales-claim/${row.id}`
                              : `/admin/order/sales-claim/${row.id}/detail`,
                          );
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
