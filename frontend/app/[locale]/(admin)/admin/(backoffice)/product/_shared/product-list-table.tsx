"use client";

import {
  AlertTriangle,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
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
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import { fetchSystemFile } from "@/lib/system-file-api";

const BASE_COLUMN_COUNT = 9;

function formatStockQty(value: number, locale: string): string {
  return Number(value).toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 0,
  });
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
  if (failed || !url) {
    return <ProductItemThumbPlaceholder />;
  }

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

function ProductItemThumbCell({
  fileId,
  locale,
}: {
  fileId: number | null | undefined;
  locale: string;
}) {
  if (fileId == null) {
    return <ProductItemThumbPlaceholder />;
  }
  return (
    <ProductItemThumbLoaded key={fileId} fileId={fileId} locale={locale} />
  );
}

function packUnitKey(unit: string): string {
  const u = unit.toLowerCase();
  if (u === "box") return "packUnitBox";
  if (u === "set") return "packUnitSet";
  return "packUnitPiece";
}

function sortFieldLabel(
  tCrud: ReturnType<typeof useTranslations<"crud">>,
  field: string,
  fieldLabel: string,
  sortKey: string | null,
  sortDir: TableSortDirection | null,
  columnKey: string
): string {
  if (sortKey !== columnKey || !sortDir) {
    return tCrud("sort.none", { field: fieldLabel });
  }
  return sortDir === "desc"
    ? tCrud("sort.desc", { field: fieldLabel })
    : tCrud("sort.asc", { field: fieldLabel });
}

export type ProductListTableProps = {
  rows: ProductItemBrowseRow[];
  loading: boolean;
  sortKey: string | null;
  sortDir: TableSortDirection | null;
  listFiltered: boolean;
  onSortChange: (
    sortKey: string | null,
    direction: TableSortDirection | null
  ) => void;
  canUpdate: boolean;
  canDelete: boolean;
  onToggleActive: (row: ProductItemBrowseRow, active: boolean) => void;
  onDelete: (row: ProductItemBrowseRow) => void;
  onOpenCars: (listId: number) => void;
  onOpenWarehouse: (itemId: number) => void;
  selectionEnabled?: boolean;
  selectedIds?: Set<number>;
  onToggleRow?: (id: number, checked: boolean) => void;
  onTogglePage?: (checked: boolean) => void;
};

export function ProductListTable({
  rows,
  loading,
  sortKey,
  sortDir,
  listFiltered,
  onSortChange,
  canUpdate,
  canDelete,
  onToggleActive,
  onDelete,
  onOpenCars,
  onOpenWarehouse,
  selectionEnabled = false,
  selectedIds,
  onToggleRow,
  onTogglePage,
}: ProductListTableProps) {
  const locale = useLocale();
  const tList = useTranslations("productList");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const columnCount =
    BASE_COLUMN_COUNT + (selectionEnabled ? 1 : 0);
  const pageIds = rows.map((r) => r.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds?.has(id));
  const pageAllSelected =
    pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const sortProps = {
    sortable: !listFiltered,
    activeSortKey: sortKey,
    sortDirection: sortDir,
    onSortChange,
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {selectionEnabled ? (
              <TableHead className="w-10">
                <Checkbox
                  checked={pageAllSelected}
                  disabled={loading || pageIds.length === 0}
                  onCheckedChange={(v) => onTogglePage?.(v === true)}
                  aria-label={tList("selectAllPage", {
                    count: pageIds.length,
                  })}
                />
              </TableHead>
            ) : null}
            <TableSortHead
              columnKey="name"
              {...sortProps}
              sortLabel={sortFieldLabel(
                tCrud,
                "name",
                tList("colProduct"),
                sortKey,
                sortDir,
                "name"
              )}
            >
              {tList("colProduct")}
            </TableSortHead>
            <TableSortHead
              columnKey="stock"
              align="right"
              className="text-right"
              {...sortProps}
              sortLabel={sortFieldLabel(
                tCrud,
                "stock",
                tList("colStock"),
                sortKey,
                sortDir,
                "stock"
              )}
            >
              {tList("colStock")}
            </TableSortHead>
            <TableSortHead
              columnKey="price"
              align="right"
              className="text-right"
              {...sortProps}
              sortLabel={sortFieldLabel(
                tCrud,
                "price",
                tList("colSellPrice"),
                sortKey,
                sortDir,
                "price"
              )}
            >
              {tList("colSellPrice")}
            </TableSortHead>
            <TableHead className="text-center">{tList("colPackaging")}</TableHead>
            <TableSortHead
              columnKey="category"
              {...sortProps}
              sortLabel={sortFieldLabel(
                tCrud,
                "category",
                tList("filterProductCategory"),
                sortKey,
                sortDir,
                "category"
              )}
            >
              {tList("filterProductCategory")}
            </TableSortHead>
            <TableSortHead
              columnKey="brand"
              {...sortProps}
              sortLabel={sortFieldLabel(
                tCrud,
                "brand",
                tList("filterProductBrand"),
                sortKey,
                sortDir,
                "brand"
              )}
            >
              {tList("filterProductBrand")}
            </TableSortHead>
            <TableHead className="text-center">{tList("colWarehouse")}</TableHead>
            <TableSortHead
              columnKey="is_active"
              align="center"
              className="text-center"
              {...sortProps}
              sortLabel={sortFieldLabel(
                tCrud,
                "is_active",
                tList("filterStatusPlaceholder"),
                sortKey,
                sortDir,
                "is_active"
              )}
            >
              {tList("filterStatusPlaceholder")}
            </TableSortHead>
            <TableHead className="text-center">{tList("colManageProduct")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <CrudListTableSkeleton columnCount={columnCount} rowCount={10} />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="text-center text-muted-foreground"
              >
                {tError("noData")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const carSummary = row.car_summary?.trim() ?? "";
              return (
              <TableRow key={row.id}>
                {selectionEnabled ? (
                  <TableCell className="w-10">
                    <Checkbox
                      checked={selectedIds?.has(row.id) ?? false}
                      onCheckedChange={(v) =>
                        onToggleRow?.(row.id, v === true)
                      }
                      aria-label={row.name}
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProductItemThumbCell
                      fileId={row.cover_system_file_id}
                      locale={locale}
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {row.is_new ? (
                          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs">
                            {tList("badgeNew")}
                          </span>
                        ) : null}
                        {row.low_stock ? (
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
                      <div className="text-muted-foreground text-sm">{row.sku}</div>
                      {row.car_count > 0 && carSummary ? (
                        <button
                          type="button"
                          className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[0.625rem] leading-snug"
                          aria-label={tList("carModalTitle")}
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
                    row.low_stock && "font-medium text-destructive"
                  )}
                >
                  {formatStockQty(row.total_stock, locale)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.price.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {row.qty_per_unit}{" "}
                  <span className="text-muted-foreground text-sm">
                    {tList(packUnitKey(row.unit))}
                  </span>
                </TableCell>
                <TableCell>{row.category_name}</TableCell>
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
                        size="sm"
                        onClick={() => onOpenWarehouse(row.id)}
                      >
                        {tList("viewMore")}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <StatusSwitchField
                    checked={row.is_active}
                    disabled={!canUpdate}
                    onCheckedChange={(checked) => onToggleActive(row, checked)}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex justify-center gap-1.5">
                    {canUpdate ? (
                      <ButtonIcon
                        variant="outline"
                        tone="neutral"
                        asChild
                        aria-label={tCrud("btn.edit")}
                      >
                        <Link
                          href={`/admin/product/list/${row.product_list_id}`}
                        >
                          <Pencil className="text-current" />
                        </Link>
                      </ButtonIcon>
                    ) : null}
                    {canDelete ? (
                      <ButtonIcon
                        type="button"
                        variant="outline"
                        tone="delete"
                        aria-label={tCrud("btn.delete")}
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="text-current" />
                      </ButtonIcon>
                    ) : null}
                  </div>
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
