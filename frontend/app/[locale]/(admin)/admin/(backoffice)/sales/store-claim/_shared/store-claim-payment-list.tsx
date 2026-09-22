"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
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
  fetchStoreClaimPayments,
  OrderStoreClaimApiError,
  type StoreClaimPaymentListItem,
} from "@/lib/order-store-claim-api";

const COLUMN_COUNT = 7;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function StoreClaimPaymentList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderStoreClaim");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_store_claim");

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

  const [category, setCategory] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StoreClaimPaymentListItem[]>([]);
  const [total, setTotal] = useState(0);

  const dateFrom = dateRange?.from ?? undefined;
  const dateTo = dateRange?.to ?? undefined;

  const load = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchStoreClaimPayments({
        page,
        limit: pageSize,
        search: debouncedQuery,
        payment_category: category || undefined,
        date_from: dateFrom,
        date_to: dateTo,
      });
      setRows(list.items);
      setTotal(list.total);
    } catch (e) {
      toast.error(
        e instanceof OrderStoreClaimApiError ? e.message : tPage("loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [perms.view, page, pageSize, debouncedQuery, category, dateFrom, dateTo, tPage]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  const actions: TableIconActionKey[] = [];
  if (perms.view) actions.push("view");
  if (perms.update || perms.create) actions.push("edit");

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
          id="store-claim-date-range"
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
          <Label htmlFor="store-claim-category">
            {tPage("filterPaymentCategory")}
          </Label>
          <Select
            value={category || "all"}
            onValueChange={(v) => {
              setCategory(!v || v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger id="store-claim-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tPage("paymentCategory.all")}</SelectItem>
              <SelectItem value="credit">
                {tPage("paymentCategory.credit")}
              </SelectItem>
              <SelectItem value="payment">
                {tPage("paymentCategory.payment")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">{tPage("colNo")}</TableHead>
              <TableHead>{tPage("colBillNumber")}</TableHead>
              <TableHead>{tPage("colOrderedAt")}</TableHead>
              <TableHead>{tPage("colCustomer")}</TableHead>
              <TableHead className="text-right">{tPage("colTotalPrice")}</TableHead>
              <TableHead>{tPage("colSeller")}</TableHead>
              <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <CrudListTableSkeleton columnCount={COLUMN_COUNT} rowCount={pageSize} />
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
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground text-center tabular-nums">
                    {(page - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="text-primary font-medium tabular-nums">
                    {row.sku?.trim() || tPage("emptyCell")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(row.created_at, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.member_name?.trim() || tPage("emptyCell")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(row.total_price, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.created_by_name?.trim() || tPage("emptyCell")}
                  </TableCell>
                  <TableCell className="text-center">
                    {actions.length > 0 ? (
                      <TableIconActions
                        actions={actions}
                        onAction={() =>
                          router.push(`/admin/sales/store-claim/${row.id}`)
                        }
                      />
                    ) : null}
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
    </div>
  );
}
