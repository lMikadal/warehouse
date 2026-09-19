"use client";

import {
  ChartPie,
  Coins,
  Info,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDate } from "@/lib/format-datetime";
import {
  deleteProductItemStock,
  fetchAllProductItemStocks,
  fetchProductItemWarehousePlacements,
  type ListItemBody,
  type ProductItemStockRow,
} from "@/lib/product-list-api";

import {
  canAddProductItemStock,
  formatLotMoney,
  LOT_COLUMN_COUNT,
  LOT_MODAL_PAGE_SIZE_OPTIONS,
  lotFooterTotals,
  lotRemainStatus,
  lotStockDerived,
  lotSummaryFromRows,
  readLotPageSize,
  writeLotPageSize,
} from "./product-list-form-lot-utils";
import { ProductListFormVariantLotFormModal } from "./product-list-form-variant-lot-form-modal";
import {
  composeItemSku,
  formatStockQty,
  itemDisplayName,
  itemSkuSuffix,
  packUnitKey,
} from "./product-list-form-utils";

const DIALOG_CLASS =
  "flex max-h-[min(92vh,calc(100vh-2rem))] max-w-[min(96rem,98vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96rem,98vw)]";

type LotListModalProps = {
  item: ListItemBody | null;
  listSku: string;
  listSupplierIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canMutate: boolean;
  loadSuppliers: (ctx: RemoteComboboxLoadContext) => Promise<
    { value: string; label: string }[]
  >;
  onStockChanged?: () => void;
};

export function ProductListFormVariantLotModal({
  item,
  listSku,
  listSupplierIds,
  open,
  onOpenChange,
  canMutate,
  loadSuppliers,
  onStockChanged,
}: LotListModalProps) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tCrud = useTranslations("crud");
  const tModal = useTranslations("modal");
  const [rows, setRows] = useState<ProductItemStockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => readLotPageSize());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editRow, setEditRow] = useState<ProductItemStockRow | null>(null);
  const [formSession, setFormSession] = useState(0);

  const itemId = item?.id ?? null;
  const displayName = item ? itemDisplayName(item, locale) : "—";
  const sku =
    item?.sku?.trim() ||
    (listSku && item ? composeItemSku(listSku, itemSkuSuffix(item, listSku)) : "") ||
    listSku ||
    "—";
  const unitLabel = tList(packUnitKey(item?.unit ?? "piece"));
  const minStock = Number(item?.minimum_stock) || 0;
  const currency = tForm("itemLotCurrencySuffix");

  const reload = useCallback(async () => {
    if (itemId == null) return;
    setLoading(true);
    try {
      const all = await fetchAllProductItemStocks(locale, itemId);
      setRows(all);
    } finally {
      setLoading(false);
    }
  }, [itemId, locale]);

  useEffect(() => {
    if (!open || itemId == null) return;
    // Data load when dialog opens (remounted via key on each open).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch populates table state
    void reload();
  }, [open, itemId, reload]);

  const summary = useMemo(() => lotSummaryFromRows(rows), [rows]);
  const { foot, footAvgActualU } = useMemo(() => lotFooterTotals(rows), [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const confirmDelete = async () => {
    if (itemId == null || deleteId == null) return;
    try {
      await deleteProductItemStock(itemId, deleteId);
      toast.success(tCrud("toast.deleted"));
      if (editRow?.id === deleteId) {
        setFormOpen(false);
        setEditRow(null);
      }
      setDeleteId(null);
      await reload();
      onStockChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openEdit = (row: ProductItemStockRow) => {
    if (formOpen) {
      toast.warning(tForm("itemLotCloseFormFirst"));
      return;
    }
    setFormMode("edit");
    setEditRow(row);
    setFormSession((n) => n + 1);
    setFormOpen(true);
  };

  const openAdd = () => {
    if (!item) return;
    if (formOpen) {
      toast.warning(tForm("itemLotCloseFormFirst"));
      return;
    }
    if (item.id == null) {
      toast.warning(tForm("itemSaveVariantFirst"));
      return;
    }
    if (!canAddProductItemStock(item)) {
      toast.warning(tForm("itemLotAddBlockedAlternate"));
      return;
    }
    void (async () => {
      let placementCount =
        item.warehouse_placements?.filter((w) => w.bin_id > 0).length ?? 0;
      try {
        const rows = await fetchProductItemWarehousePlacements(locale, item.id!);
        placementCount = Math.max(placementCount, rows.length);
      } catch {
        /* use draft count */
      }
      if (placementCount === 0) {
        toast.warning(tForm("itemLotNeedPlacementHint"));
        return;
      }
      setFormMode("add");
      setEditRow(null);
      setFormSession((n) => n + 1);
      setFormOpen(true);
    })();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={DIALOG_CLASS} showCloseButton={false}>
          <div className="border-border shrink-0 border-b px-4 pt-4 pb-4 sm:px-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Package className="size-5" aria-hidden />
                </span>
                <h2 className="text-primary text-lg font-semibold">
                  {tForm("itemLotDialogTitle")}
                </h2>
              </div>
              <ButtonIcon
                type="button"
                variant="ghost"
                aria-label={tCrud("btn.cancel")}
                onClick={() => onOpenChange(false)}
              >
                <X className="text-current" />
              </ButtonIcon>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-y-1">
                <span className="text-muted-foreground mr-1.5">
                  {tForm("itemLotMetaSku")}
                </span>
                <span className="bg-primary/12 text-primary rounded-full px-2 py-0.5 font-medium tabular-nums">
                  {sku}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-y-1">
                <span className="text-muted-foreground mr-1.5">
                  {tForm("itemLotMetaName")}
                </span>
                <span className="font-medium">{displayName}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                tone="blue"
                icon={<Package className="size-5" aria-hidden />}
                label={tForm("itemLotSummaryReceived")}
                amount={formatStockQty(summary.received, locale)}
                unit={unitLabel}
              />
              <StatCard
                tone="green"
                icon={<Coins className="size-5" aria-hidden />}
                label={tForm("itemLotSummaryAvgCost")}
                amount={formatLotMoney(summary.avgCost, locale)}
                unit={currency}
              />
              <StatCard
                tone="orange"
                icon={<ShoppingBag className="size-5" aria-hidden />}
                label={tForm("itemLotSummaryAvgSell")}
                amount={formatLotMoney(summary.avgSell, locale)}
                unit={currency}
              />
              <StatCard
                tone="profit"
                icon={<ChartPie className="size-5" aria-hidden />}
                label={tForm("itemLotSummaryAvgProfit")}
                amount={formatLotMoney(summary.avgProfit, locale)}
                unit={currency}
                marginPct={summary.marginPct}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-5">
            <div className="border-border overflow-hidden rounded-md border">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead colSpan={4} className="bg-sky-50/80 dark:bg-sky-950/30">
                      <GroupLabel icon={<Info className="size-3.5" />} label={tForm("itemLotGroupLot")} />
                    </TableHead>
                    <TableHead colSpan={4} className="bg-violet-50/80 dark:bg-violet-950/30">
                      <GroupLabel icon={<Package className="size-3.5" />} label={tForm("itemLotGroupQty")} />
                    </TableHead>
                    <TableHead colSpan={3} className="bg-amber-50/80 dark:bg-amber-950/30">
                      <GroupLabel icon={<Coins className="size-3.5" />} label={tForm("itemLotGroupUnitCost")} />
                    </TableHead>
                    <TableHead colSpan={3} className="bg-orange-50/80 dark:bg-orange-950/30">
                      <GroupLabel icon={<Coins className="size-3.5" />} label={tForm("itemLotGroupTotalCost")} />
                    </TableHead>
                    <TableHead colSpan={2} className="bg-emerald-50/80 dark:bg-emerald-950/30">
                      <GroupLabel icon={<ShoppingBag className="size-3.5" />} label={tForm("itemLotGroupSell")} />
                    </TableHead>
                    <TableHead rowSpan={2} className="bg-muted/50 text-center align-middle">
                      {tCrud("table.actions")}
                    </TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{tForm("itemLotColLot")}</TableHead>
                    <TableHead>{tForm("itemLotColReceived")}</TableHead>
                    <TableHead>{tForm("itemLotColPartnerPo")}</TableHead>
                    <TableHead>{tForm("itemUnit")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColOrderQty")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColFreeGift")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColReceivedQty")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColRemain")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColCost")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColDiscountUnit")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColActualUnit")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColNetTotal")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColDiscountTotal")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColActualTotal")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColSell")}</TableHead>
                    <TableHead className="text-right tabular-nums">{tForm("itemLotColProfitUnit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <CrudListTableSkeleton columnCount={LOT_COLUMN_COUNT} rowCount={4} />
                  ) : slice.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={LOT_COLUMN_COUNT} className="text-muted-foreground text-center">
                        {tForm("itemLotEmpty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    slice.map((row, idx) => {
                      const lotNum = (safePage - 1) * pageSize + idx + 1;
                      const d = lotStockDerived(row);
                      const st = lotRemainStatus(row.remain_quantity, minStock);
                      const recv = row.received_at
                        ? formatDate(row.received_at, locale)
                        : "—";
                      const binLine = row.bin_sku?.trim() || row.bin_label || "—";
                      const partner = row.partner_name?.trim() || "—";
                      const poSku = row.po_sku?.trim();

                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="flex items-center gap-1 font-medium">
                              #{`Lot ${lotNum}`}
                              {row.is_used ? (
                                <Star
                                  className="size-3.5 fill-amber-400 text-amber-500"
                                  aria-label={tForm("itemLotActiveLot")}
                                />
                              ) : null}
                            </div>
                            <div className="text-muted-foreground text-xs">{binLine}</div>
                          </TableCell>
                          <TableCell>{recv}</TableCell>
                          <TableCell className="min-w-48 align-top">
                            <div>{partner}</div>
                            {poSku ? (
                              <button
                                type="button"
                                className="text-primary text-xs underline-offset-2 hover:underline"
                                onClick={() => toast.info(tList("importExportSoon"))}
                              >
                                {poSku}
                              </button>
                            ) : null}
                          </TableCell>
                          <TableCell>{unitLabel}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.order_quantity.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.order_free_gift.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-primary text-right font-medium tabular-nums">
                            {row.quantity.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <div className="flex flex-col items-end gap-0.5">
                              <span>{formatStockQty(row.remain_quantity, locale)}</span>
                              <span
                                className={
                                  st.tone === "out"
                                    ? "text-destructive text-xs"
                                    : st.tone === "low"
                                      ? "text-amber-600 text-xs dark:text-amber-400"
                                      : "text-green-600 text-xs dark:text-green-400"
                                }
                              >
                                {tForm(st.key)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.cost_per_unit.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.discount_per_unit.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatLotMoney(d.actualU, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatLotMoney(d.netTotal, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatLotMoney(d.discTotal, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatLotMoney(d.actualTotal, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.sell_price.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <div>{formatLotMoney(d.profit, locale)}</div>
                            {d.margin != null ? (
                              <div className="text-muted-foreground text-xs">
                                {tForm("itemLotProfitPctLine", {
                                  pct: d.margin.toFixed(2),
                                })}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-center">
                            {canMutate ? (
                              <div className="inline-flex items-center gap-1">
                                <ButtonIcon
                                  type="button"
                                  variant="outline"
                                  aria-label={tCrud("btn.edit")}
                                  disabled={formOpen}
                                  onClick={() => openEdit(row)}
                                >
                                  <Pencil className="text-current" />
                                </ButtonIcon>
                                <ButtonIcon
                                  type="button"
                                  variant="outline"
                                  tone="delete"
                                  aria-label={tCrud("btn.delete")}
                                  disabled={formOpen}
                                  onClick={() => setDeleteId(row.id)}
                                >
                                  <Trash2 className="text-current" />
                                </ButtonIcon>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {!loading && rows.length > 0 ? (
                  <TableFooter>
                    <TableRow className="bg-muted/30 font-medium hover:bg-muted/30">
                      <TableCell colSpan={4}>{tForm("itemLotFooterTotal")}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatStockQty(foot.order, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatStockQty(foot.free, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatStockQty(foot.qty, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatStockQty(foot.remain, locale)}
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell className="text-right tabular-nums">
                        {footAvgActualU != null
                          ? formatLotMoney(footAvgActualU, locale)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLotMoney(foot.netTotal, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLotMoney(foot.discTotal, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatLotMoney(foot.actualTotal, locale)}
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell className="text-center">
                        {canMutate && item && canAddProductItemStock(item) ? (
                          <ButtonIcon
                            type="button"
                            variant="outline"
                            tone="add"
                            aria-label={tForm("itemLotAdd")}
                            onClick={openAdd}
                          >
                            <Plus className="text-current" />
                          </ButtonIcon>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
              </div>
              {rows.length > 0 ? (
                <CrudPaginationBar
                  className="mt-0 border-t border-border"
                  page={safePage}
                  pageSize={pageSize}
                  pageSizeOptions={LOT_MODAL_PAGE_SIZE_OPTIONS}
                  meta={{ total: rows.length, totalPages }}
                  onPageChange={setPage}
                  onPageSizeChange={(n) => {
                    if (
                      !LOT_MODAL_PAGE_SIZE_OPTIONS.includes(
                        n as (typeof LOT_MODAL_PAGE_SIZE_OPTIONS)[number]
                      )
                    ) {
                      return;
                    }
                    setPageSize(n as (typeof LOT_MODAL_PAGE_SIZE_OPTIONS)[number]);
                    writeLotPageSize(n);
                    setPage(1);
                  }}
                />
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-border mx-0 mb-0 shrink-0 border-t px-4 py-3 sm:px-5 sm:justify-end">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              {tModal("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
        onConfirm={() => void confirmDelete()}
      />

      {item && itemId != null ? (
        <ProductListFormVariantLotFormModal
          key={formSession}
          mode={formMode}
          item={item}
          listSupplierIds={listSupplierIds}
          editRow={formMode === "edit" ? editRow : null}
          open={formOpen}
          onOpenChange={setFormOpen}
          loadSuppliers={loadSuppliers}
          onSaved={() => {
            void reload();
            onStockChanged?.();
          }}
        />
      ) : null}
    </>
  );
}

function GroupLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
      {icon}
      {label}
    </span>
  );
}

function StatCard({
  tone,
  icon,
  label,
  amount,
  unit,
  marginPct,
}: {
  tone: "blue" | "green" | "orange" | "profit";
  icon: ReactNode;
  label: string;
  amount: ReactNode;
  unit?: string;
  marginPct?: string | null;
}) {
  const iconWellClass =
    tone === "blue"
      ? "bg-primary/15 text-primary"
      : tone === "orange"
        ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

  return (
    <div className="border-border bg-background flex items-center gap-2.5 rounded-[var(--radius)] border p-3">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconWellClass}`}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="text-muted-foreground text-xs leading-snug">{label}</div>
        <div className="text-lg leading-tight font-semibold tabular-nums">
          {amount}
          {unit ? (
            <>
              {" "}
              <span className="text-muted-foreground text-sm font-normal">{unit}</span>
            </>
          ) : null}
        </div>
        {marginPct ? (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {marginPct}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

