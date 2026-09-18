"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDate } from "@/lib/format-datetime";
import {
  fetchProductItemStocks,
  type ListItemBody,
  type ProductItemStockRow,
} from "@/lib/product-list-api";

import {
  formatStockQty,
  itemDisplayName,
  marginPct,
} from "./product-list-form-utils";

const DIALOG_CLASS =
  "max-w-[min(64rem,calc(100vw-2rem))] w-full sm:max-w-[64rem]";
const LOT_COLUMN_COUNT = 8;
const LOT_PAGE_SIZE = 10;

type LotListModalProps = {
  item: ListItemBody | null;
  listSku: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductListFormVariantLotModal({
  item,
  listSku,
  open,
  onOpenChange,
}: LotListModalProps) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ProductItemStockRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const itemId = item?.id ?? null;
  const displayName = item ? itemDisplayName(item, locale) : "—";
  const sku = item?.sku?.trim() || listSku || "—";

  useEffect(() => {
    if (!open || itemId == null) return;
    setLoading(true);
    void fetchProductItemStocks(locale, itemId, { page, limit: LOT_PAGE_SIZE })
      .then((res) => {
        setRows(res.items);
        setTotal(res.meta.total);
      })
      .finally(() => setLoading(false));
  }, [open, itemId, locale, page]);

  const summary = useMemo(() => {
    let received = 0;
    let costSum = 0;
    let sellSum = 0;
    let costW = 0;
    let sellW = 0;
    for (const r of rows) {
      const q = Number(r.quantity) || 0;
      received += q;
      if (q > 0) {
        costSum += (Number(r.cost_per_unit) || 0) * q;
        sellSum += (Number(r.sell_price) || 0) * q;
        costW += q;
        sellW += q;
      }
    }
    const avgCost = costW > 0 ? costSum / costW : 0;
    const avgSell = sellW > 0 ? sellSum / sellW : 0;
    const avgProfit = avgSell - avgCost;
    return { received, avgCost, avgSell, avgProfit };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / LOT_PAGE_SIZE));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>{tForm("itemLotDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{tForm("itemLotMetaSku")}: </span>
            {sku}
            <span className="mx-2">·</span>
            <span className="font-medium text-foreground">{tForm("itemLotMetaName")}: </span>
            {displayName}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={tForm("itemLotSummaryReceived")} value={formatStockQty(summary.received, locale)} />
            <Stat
              label={tForm("itemLotSummaryAvgCost")}
              value={summary.avgCost.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            />
            <Stat
              label={tForm("itemLotSummaryAvgSell")}
              value={summary.avgSell.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            />
            <Stat
              label={tForm("itemLotSummaryAvgProfit")}
              value={summary.avgProfit.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            />
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tForm("itemLotColLot")}</TableHead>
                  <TableHead>{tForm("itemLotColReceived")}</TableHead>
                  <TableHead>{tList("wpLabelBin")}</TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tForm("itemLotColReceivedQty")}
                  </TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tForm("itemLotColRemain")}
                  </TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tForm("itemLotColCost")}
                  </TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tForm("itemLotColSell")}
                  </TableHead>
                  <TableHead className="text-center">{tForm("itemLotActiveLot")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <CrudListTableSkeleton
                    columnCount={LOT_COLUMN_COUNT}
                    rowCount={4}
                  />
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={LOT_COLUMN_COUNT}
                      className="text-muted-foreground text-center"
                    >
                      {tForm("itemLotEmpty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="tabular-nums">{r.id}</TableCell>
                      <TableCell>
                        {r.received_at
                          ? formatDate(r.received_at, locale)
                          : "—"}
                      </TableCell>
                      <TableCell>{r.bin_label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatStockQty(r.quantity, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatStockQty(r.remain_quantity, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.cost_per_unit.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.sell_price.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({marginPct(r.sell_price, r.cost_per_unit)}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.is_used ? "✓" : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {total > LOT_PAGE_SIZE ? (
            <CrudPaginationBar
              page={page}
              pageSize={10}
              meta={{ total, totalPages }}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          ) : null}
        </div>
        <DialogFooter className="justify-end sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
