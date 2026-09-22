"use client";

import {
  AlertTriangle,
  EyeOff,
  Image as ImageIcon,
  Package,
  Plus,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSortHead,
  type TableSortDirection,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import { fetchSystemFile } from "@/lib/system-file-api";

const COLUMN_COUNT = 8;

function formatStockQty(value: number, locale: string): string {
  return Number(value).toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 0,
  });
}

function formatMoney(n: number, locale: string) {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function packUnitKey(unit: string): string {
  const u = unit.toLowerCase();
  if (u === "box") return "packUnitBox";
  if (u === "set") return "packUnitSet";
  return "packUnitPiece";
}

function ProductItemThumbPlaceholder() {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30"
      aria-hidden
    >
      <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
    </div>
  );
}

function ProductItemThumbLoaded({
  fileId,
  locale,
}: {
  fileId: number;
  locale: string;
}) {
  const t = useTranslations();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSystemFile(locale, fileId)
      .then((item) => {
        if (!cancelled) setUrl(item.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, locale]);

  if (loading) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (failed || !url) return <ProductItemThumbPlaceholder />;

  return (
    <>
      <button
        type="button"
        className="block size-10 shrink-0 overflow-hidden rounded-md border border-border"
        onClick={() => setPreviewOpen(true)}
        aria-label={t("form.upload.view")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="size-full object-cover" />
      </button>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg p-2">
          <DialogTitle className="sr-only">{t("form.upload.view")}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function SellPriceCell({
  row,
  locale,
  wholesaleMinQtyLabel,
}: {
  row: ProductItemBrowseRow;
  locale: string;
  wholesaleMinQtyLabel: (count: number) => string;
}) {
  const list = row.price ?? 0;
  const wh = row.price_wholesale;
  const minQty = row.amount_price_wholesale;
  const showWh =
    row.type_price !== "stock" &&
    wh != null &&
    Number.isFinite(wh) &&
    wh > 0 &&
    minQty != null &&
    Number.isFinite(minQty) &&
    minQty > 0;

  return (
    <div className="space-y-0.5">
      <div className="tabular-nums font-medium">{formatMoney(list, locale)}</div>
      {showWh ? (
        <>
          <div className="text-destructive tabular-nums text-sm">
            {formatMoney(wh, locale)}
          </div>
          <div className="text-destructive text-xs">
            {wholesaleMinQtyLabel(Math.trunc(minQty))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export type StoreSalesProductBrowseTableProps = {
  rows: ProductItemBrowseRow[];
  loading: boolean;
  sortKey: string | null;
  sortDir: TableSortDirection | null;
  onSortChange: (
    sortKey: string | null,
    direction: TableSortDirection | null
  ) => void;
  selectedIds: Record<number, boolean>;
  onToggleRow: (id: number, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
  onAdd: (row: ProductItemBrowseRow) => void;
  cartQtyByItemId?: Record<number, number>;
  onOpenCars: (listId: number) => void;
  onOpenWarehouse: (itemId: number) => void;
  disabled?: boolean;
  /** Purchase requests order what is *not* in stock, so they opt out of the stock gate. */
  allowOutOfStock?: boolean;
};

export function StoreSalesProductBrowseTable({
  rows,
  loading,
  sortKey,
  sortDir,
  onSortChange,
  selectedIds,
  onToggleRow,
  onTogglePage,
  onAdd,
  cartQtyByItemId = {},
  onOpenCars,
  onOpenWarehouse,
  disabled = false,
  allowOutOfStock = false,
}: StoreSalesProductBrowseTableProps) {
  const locale = useLocale();
  const tList = useTranslations("productList");
  const tForm = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const pageIds = rows.map((r) => r.id);
  const pageAllSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds[id]);

  const sortProps = {
    sortable: true,
    activeSortKey: sortKey,
    sortDirection: sortDir,
    onSortChange,
  };

  const sortLabel = (field: string, label: string, key: string) => {
    if (sortKey !== key || !sortDir) {
      return tCrud("sort.none", { field: label });
    }
    return sortDir === "desc"
      ? tCrud("sort.desc", { field: label })
      : tCrud("sort.asc", { field: label });
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={pageAllSelected}
                disabled={loading || disabled || pageIds.length === 0}
                onCheckedChange={(v) => onTogglePage(v === true)}
                aria-label={tForm("selectAll")}
              />
            </TableHead>
            <TableSortHead
              columnKey="name"
              {...sortProps}
              sortLabel={sortLabel("name", tList("colProduct"), "name")}
            >
              {tList("colProduct")}
            </TableSortHead>
            <TableSortHead
              columnKey="available_stock"
              align="right"
              className="text-right"
              {...sortProps}
              sortLabel={sortLabel(
                "stock",
                tList("colStock"),
                "available_stock"
              )}
            >
              {tList("colStock")}
            </TableSortHead>
            <TableSortHead
              columnKey="price"
              align="right"
              className="text-right"
              {...sortProps}
              sortLabel={sortLabel(
                "price",
                tList("colSellPrice"),
                "price"
              )}
            >
              {tList("colSellPrice")}
            </TableSortHead>
            <TableHead className="text-center">{tList("colPackaging")}</TableHead>
            <TableSortHead
              columnKey="brand"
              {...sortProps}
              sortLabel={sortLabel("brand", tList("filterProductBrand"), "brand")}
            >
              {tList("filterProductBrand")}
            </TableSortHead>
            <TableHead className="text-center">{tList("colWarehouse")}</TableHead>
            <TableHead className="text-center">{tList("colManageProduct")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <CrudListTableSkeleton columnCount={COLUMN_COUNT} rowCount={10} />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="text-center text-muted-foreground"
              >
                {tError("noData")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const stock =
                row.available_stock ?? row.total_stock ?? 0;
              const low =
                row.low_stock ||
                stock < (row.minimum_stock ?? 0);
              const carSummary = row.car_summary?.trim() ?? "";
              const inCart = cartQtyByItemId[row.id] ?? 0;
              const addDisabled =
                disabled || (!allowOutOfStock && (stock < 1 || inCart >= stock));
              return (
                <TableRow key={row.id}>
                  <TableCell className="w-10">
                    <Checkbox
                      checked={!!selectedIds[row.id]}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        onToggleRow(row.id, v === true)
                      }
                      aria-label={row.name}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.cover_system_file_id != null ? (
                        <ProductItemThumbLoaded
                          fileId={row.cover_system_file_id}
                          locale={locale}
                        />
                      ) : (
                        <ProductItemThumbPlaceholder />
                      )}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {row.is_new ? (
                            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs">
                              {tList("badgeNew")}
                            </span>
                          ) : null}
                          {low ? (
                            <span className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                              <AlertTriangle className="size-3" />
                              {tList("lowStock")}
                            </span>
                          ) : null}
                          {row.is_stopped ? (
                            <span className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                              <EyeOff className="size-3" />
                              {tList("salesStopped")}
                            </span>
                          ) : null}
                        </div>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-muted-foreground text-sm">
                          SKU: {row.sku}
                        </div>
                        {row.car_count > 0 && carSummary ? (
                          <button
                            type="button"
                            className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[0.625rem] leading-snug"
                            onClick={() => onOpenCars(row.product_list_id)}
                          >
                            <span className="truncate">{carSummary}</span>
                            {row.car_count > 1 ? (
                              <span className="shrink-0 opacity-85">
                                +{row.car_count - 1}
                              </span>
                            ) : null}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      low && "font-medium text-destructive"
                    )}
                  >
                    {formatStockQty(stock, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <SellPriceCell
                      row={row}
                      locale={locale}
                      wholesaleMinQtyLabel={(count) =>
                        tForm("wholesaleMinQty", { count })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.qty_per_unit}{" "}
                    <span className="text-muted-foreground text-sm">
                      {tList(packUnitKey(row.unit))}
                    </span>
                  </TableCell>
                  <TableCell>{row.brand_name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm">
                        {tList("warehouseCountLabel", {
                          count: row.warehouse_root_count,
                        })}
                      </span>
                      {row.warehouse_root_count > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={disabled}
                          onClick={() => onOpenWarehouse(row.id)}
                        >
                          {tList("viewMore")}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <ButtonIcon
                      variant="outline"
                      tone="add"
                      disabled={addDisabled}
                      onClick={() => onAdd(row)}
                      aria-label={tList("colManageProduct")}
                    >
                      <Plus className="text-current" aria-hidden />
                    </ButtonIcon>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function StoreSalesProductBrowseEmpty() {
  const tForm = useTranslations("page.orderStore.form");
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center text-sm">
      <p>{tForm("productSearchHint")}</p>
    </div>
  );
}
