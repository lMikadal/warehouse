"use client";

import { Check, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
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
  fetchQuotationCount,
  fetchQuotationList,
  OrderQuotationApiError,
  patchQuotationStatus,
  type QuotationListItem,
  type QuotationStatus,
} from "@/lib/order-quotation-api";
import {
  loadQuotationSellerComboboxOptions,
  resolveQuotationSellerLabel,
} from "@/lib/order-quotation-sellers-combobox";
import { cn } from "@/lib/utils";

import {
  quotationStatusFilterButtonClass,
  quotationStatusPillClass,
  type QuotationStatusFilter,
} from "./quotation-status-styles";

const STATUS_TABS: QuotationStatusFilter[] = [
  "",
  "success",
  "pending",
  "draft",
  "overdue",
  "cancelled",
  "rejected",
];

const COLUMN_COUNT = 8;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function rowActions(
  row: QuotationListItem,
  canView: boolean,
  canUpdate: boolean
): TableIconActionKey[] {
  if (row.receipt_locked && !canUpdate) {
    return canView ? ["view"] : [];
  }
  const actions: TableIconActionKey[] = [];
  if (row.status === "draft") {
    if (canUpdate) actions.push("edit", "cancel");
  } else if (row.status === "pending") {
    if (canView) actions.push("view");
    if (canUpdate && !row.receipt_locked) actions.push("cancel");
  } else if (canView) {
    actions.push("view");
  }
  return actions;
}

export function QuotationList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderQuotation");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_quotation");

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

  const [statusFilter, setStatusFilter] = useState<QuotationStatusFilter>("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [sellerId, setSellerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<QuotationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [overdueCount, setOverdueCount] = useState(0);
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
      const listParams = {
        page,
        limit: pageSize,
        search: debouncedQuery,
        status:
          statusFilter !== "" && statusFilter !== "overdue"
            ? (statusFilter as QuotationStatus)
            : undefined,
        overdue: statusFilter === "overdue",
        date_from: dateFrom,
        date_to: dateTo,
        created_by: sellerId || undefined,
      };
      const [list, count] = await Promise.all([
        fetchQuotationList(locale, listParams),
        fetchQuotationCount(locale, {
          search: debouncedQuery,
          date_from: dateFrom,
          date_to: dateTo,
          created_by: sellerId || undefined,
        }),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setCounts(count.by_status ?? {});
      setOverdueCount(count.overdue ?? 0);
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("loadFailed")
      );
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

  const onCancelConfirm = async () => {
    if (cancelId == null) return;
    try {
      await patchQuotationStatus(locale, cancelId, "cancelled");
      toast.success(tCrud("toast.saved"));
      setCancelId(null);
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
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
              <Link href="/admin/sales/quotation/new">
                <Plus className="text-current" aria-hidden />
                {tPage("create")}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(14rem,20rem)] md:items-end">
          <CrudSearchField
            value={query}
            onChange={onSearchChange}
            className="min-w-0 w-full max-md:min-w-0"
          />
          <DatePicker
            id="quotation-date-range"
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
            loadQuotationSellerComboboxOptions(locale, { search, signal })
          }
          resolveSelectedLabel={(value) =>
            resolveQuotationSellerLabel(locale, value)
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((st) => {
          const count =
            st === ""
              ? Object.values(counts).reduce((a, b) => a + b, 0)
              : st === "overdue"
                ? overdueCount
                : counts[st] ?? 0;
          const active = statusFilter === st;
          const label =
            st === ""
              ? tPage("statusAll")
              : st === "overdue"
                ? tPage("statusOverdue")
                : tPage(`saleStatus.${st}`);
          return (
            <button
              key={st || "all"}
              type="button"
              className={quotationStatusFilterButtonClass(st, active)}
              aria-pressed={active}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              <span
                className={cn(
                  quotationStatusPillClass(st, {
                    allFilterActive: st === "" && active,
                  }),
                  !active && "opacity-55 hover:opacity-100"
                )}
              >
                {label} ({count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tPage("colSku")}</TableHead>
              <TableHead>{tPage("colMember")}</TableHead>
              <TableHead>{tPage("colCreatedAt")}</TableHead>
              <TableHead className="text-right tabular-nums">
                {tPage("colTotal")}
              </TableHead>
              <TableHead className="text-center">{tPage("colStatus")}</TableHead>
              <TableHead className="text-center">{tPage("colFulfill")}</TableHead>
              <TableHead>{tPage("colSeller")}</TableHead>
              <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <CrudListTableSkeleton columnCount={COLUMN_COUNT} rowCount={pageSize} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center">
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const actions = rowActions(row, perms.view, perms.update);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/admin/sales/quotation/${row.id}`}
                        className="text-primary hover:underline"
                      >
                        {row.sku || `#${row.id}`}
                      </Link>
                    </TableCell>
                    <TableCell>{row.member_name?.trim() || "—"}</TableCell>
                    <TableCell>
                      {formatDateTime(row.created_at, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.grand_total, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={quotationStatusPillClass(row.status)}>
                        {tPage(`saleStatus.${row.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.fulfilled ? (
                        <Check className="mx-auto size-4 text-warehouse-success-fg" />
                      ) : (
                        <X className="mx-auto size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>{row.created_by_name?.trim() || "—"}</TableCell>
                    <TableCell className="text-center">
                      {actions.length > 0 ? (
                        <TableIconActions
                          actions={actions}
                          onAction={(action) => {
                            if (action === "cancel") {
                              setCancelId(row.id);
                              return;
                            }
                            router.push(
                              action === "edit"
                                ? `/admin/sales/quotation/${row.id}/edit`
                                : `/admin/sales/quotation/${row.id}`
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
        open={cancelId != null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title={tPage("confirmCancel")}
        onConfirm={() => void onCancelConfirm()}
      />
    </div>
  );
}
