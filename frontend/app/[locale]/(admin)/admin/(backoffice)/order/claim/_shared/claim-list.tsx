"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import {
  CLAIM_RESOLUTIONS,
  CLAIM_WRITE_OFF,
  fetchClaimCount,
  fetchClaimList,
  OrderClaimApiError,
  updateClaim,
  type ClaimListItem,
  type ClaimStatusFilter,
} from "@/lib/order-claim-api";

import {
  CLAIM_STATUS_FILTER_ORDER,
  claimStatusChipBadgeClass,
  claimStatusChipClass,
  claimStatusPillClass,
} from "./claim-status-styles";

const COLUMN_COUNT = 6;

/** v1: view always; edit and cancel only while the claim is still open. */
function rowActions(
  row: ClaimListItem,
  perms: { view: boolean; update: boolean; delete: boolean }
): TableIconActionKey[] {
  const actions: TableIconActionKey[] = [];
  if (perms.view) actions.push("view");
  const open = row.status !== "completed" && row.status !== "cancelled";
  if (perms.update && open) actions.push("edit");
  if (perms.delete && open) actions.push("cancel");
  return actions;
}

/** Purchase-side claim/return queue — chrome matches sales-claim list. */
export function ClaimList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderClaim");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_claim");

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

  const [statusFilter, setStatusFilter] = useState<ClaimStatusFilter>("");
  const [resolutionFilter, setResolutionFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClaimListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [cancelTarget, setCancelTarget] = useState<ClaimListItem | null>(null);

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
        resolution: resolutionFilter || undefined,
        date_from: dateFrom,
        date_to: dateTo,
      };
      const [list, count] = await Promise.all([
        fetchClaimList({
          ...shared,
          page,
          limit: pageSize,
          status: statusFilter || undefined,
        }),
        fetchClaimCount(shared),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setTotalAll(count.count);
      setStatusCounts(count.by_status ?? {});
    } catch (e) {
      toast.error(e instanceof OrderClaimApiError ? e.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [
    perms.view,
    page,
    pageSize,
    debouncedQuery,
    statusFilter,
    resolutionFilter,
    dateFrom,
    dateTo,
    t,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusChips = useMemo(
    () => [
      { value: "" as ClaimStatusFilter, label: t("tabAll"), count: totalAll },
      ...CLAIM_STATUS_FILTER_ORDER.map((value) => ({
        value: value as ClaimStatusFilter,
        label: t(`status.${value}`),
        count: statusCounts[value] ?? 0,
      })),
    ],
    [t, totalAll, statusCounts]
  );

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await updateClaim(locale, cancelTarget.id, {
        resolution: CLAIM_WRITE_OFF,
        status: "cancelled",
        note_resolution:
          cancelTarget.note_resolution.trim() || t("edit.rejectModal.title"),
      });
      toast.success(t("cancelSuccess"));
      setCancelTarget(null);
      void load();
    } catch (e) {
      toast.error(e instanceof OrderClaimApiError ? e.message : t("cancelFailed"));
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader title={t("pageTitle")} description={t("pageSubtitle")} />

      <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CrudSearchField
          value={query}
          onChange={onSearchChange}
          placeholder={t("searchPlaceholder")}
        />
        <DatePicker
          id="claim-date-range"
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
        <div className="grid gap-1.5">
          <Label htmlFor="claim-resolution">{t("filterTypeLabel")}</Label>
          <Select
            value={resolutionFilter || "all"}
            onValueChange={(v) => {
              setResolutionFilter(v && v !== "all" ? v : "");
              setPage(1);
            }}
          >
            <SelectTrigger id="claim-resolution">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterTypeAll")}</SelectItem>
              {CLAIM_RESOLUTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`resolution.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              className={claimStatusChipClass(chip.value, active)}
              onClick={() => {
                setStatusFilter(chip.value);
                setPage(1);
              }}
            >
              {chip.label}
              <span className={claimStatusChipBadgeClass(active)}>
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
              <TableHead>{t("colClaimNumber")}</TableHead>
              <TableHead className="text-center">{t("colClaimDate")}</TableHead>
              <TableHead>{t("colPurchaseNumber")}</TableHead>
              <TableHead>{t("colRequester")}</TableHead>
              <TableHead className="text-center">{t("colStatus")}</TableHead>
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
                  className="py-10 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium tabular-nums text-primary">
                    {row.sku.trim() || t("emptyCell")}
                    {row.purchase_claim_sku?.trim() ? (
                      <span className="block text-xs text-muted-foreground">
                        {row.purchase_claim_sku}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {formatDateTime(row.created_at, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {row.purchase_order_sku?.trim() || t("emptyCell")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.supplier_name?.trim() ||
                      row.created_by_name?.trim() ||
                      t("emptyCell")}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={claimStatusPillClass(row.status)}>
                      {t(`status.${row.status}`)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <TableIconActions
                      actions={rowActions(row, perms)}
                      onAction={(action) => {
                        if (action === "view") {
                          router.push(`/admin/order/claim/${row.id}/detail`);
                        } else if (action === "edit") {
                          router.push(`/admin/order/claim/${row.id}`);
                        } else if (action === "cancel") {
                          setCancelTarget(row);
                        }
                      }}
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
        onPageSizeChange={(size) => onPageSizeChange(size as typeof pageSize)}
      />

      <CrudDeleteConfirmDialog
        open={cancelTarget != null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title={t("edit.rejectModal.title")}
        description={t("edit.rejectModal.subtitle")}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  );
}
