"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, type DisplayLocale } from "@/lib/format-datetime";
import type {
  HistoryGroupBy,
  PurchaseHistoryChild,
  PurchaseHistoryGroup,
  PurchaseHistoryMetrics,
} from "@/lib/product-list-api";

function formatMoney(n: number) {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(n: number) {
  return n.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function periodLabel(key: string, groupBy: HistoryGroupBy, locale: DisplayLocale) {
  if (groupBy === "day" && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return formatDate(key, locale);
  }
  if (groupBy === "month" && /^\d{4}-\d{2}$/.test(key)) {
    return formatDate(`${key}-01`, locale);
  }
  return key;
}

function MetricCells({
  m,
  profitLabel,
}: {
  m: PurchaseHistoryMetrics;
  profitLabel: (pct: string) => string;
}) {
  const pct =
    Number.isFinite(m.profit_pct) && m.sell_price_per_piece > 0
      ? m.profit_pct.toFixed(1)
      : null;
  return (
    <>
      <TableCell className="text-right tabular-nums">
        {formatQty(m.qty_ordered_pieces)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatQty(m.qty_free_pieces)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatQty(m.qty_received_pieces)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.cost_per_unit)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.discount_per_unit)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.net_cost_baht)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.discount_baht)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.net_cost_per_piece)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.sell_price_per_piece)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <div className="flex flex-col items-end gap-0.5">
          <span>{formatMoney(m.profit_per_piece)}</span>
          {pct != null ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {profitLabel(pct)}
            </span>
          ) : null}
        </div>
      </TableCell>
    </>
  );
}

type Props = {
  groupBy: HistoryGroupBy;
  groups: PurchaseHistoryGroup[];
  onOpenLots?: (child: PurchaseHistoryChild) => void;
};

export function ProductListFormHistoryPurchaseTable({
  groupBy,
  groups,
  onOpenLots,
}: Props) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const isOpen = (key: string) => open[key] !== false;

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {tForm("histPurchaseEmpty")}
      </p>
    );
  }

  const profitLabel = (pct: string) =>
    tForm("itemLotProfitPctLine", { pct });

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2}>{tForm("histColOrderDate")}</TableHead>
            <TableHead rowSpan={2}>{tForm("histColProduct")}</TableHead>
            <TableHead rowSpan={2} className="text-center">
              {tForm("histColUnit")}
            </TableHead>
            <TableHead colSpan={3} className="text-center">
              {tForm("histGroupQty")}
            </TableHead>
            <TableHead colSpan={2} className="text-center">
              {tForm("histGroupUnitCost")}
            </TableHead>
            <TableHead colSpan={3} className="text-center">
              {tForm("histGroupCost")}
            </TableHead>
            <TableHead colSpan={2} className="text-center">
              {tForm("histGroupSell")}
            </TableHead>
            <TableHead rowSpan={2}>{tForm("histColPartner")}</TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="text-right">{tForm("histColOrdered")}</TableHead>
            <TableHead className="text-right">{tForm("histColFree")}</TableHead>
            <TableHead className="text-right">
              {tForm("histColReceived")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColCostPerUnit")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColDiscountPerUnit")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColNetCostTotal")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColDiscountBaht")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColNetCostPerPiece")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColSellPerPiece")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColProfitPerPiece")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => {
            const expanded = isOpen(g.period_key);
            return (
              <Fragment key={g.period_key}>
                <TableRow className="bg-muted/40">
                  <TableCell>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 font-medium"
                      aria-expanded={expanded}
                      onClick={() =>
                        setOpen((prev) => ({
                          ...prev,
                          [g.period_key]: !expanded,
                        }))
                      }
                    >
                      {expanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                      {periodLabel(g.period_key, groupBy, locale)}
                    </button>
                  </TableCell>
                  <TableCell>—</TableCell>
                  <TableCell className="text-center">—</TableCell>
                  <MetricCells m={g.metrics} profitLabel={profitLabel} />
                  <TableCell>
                    {tForm("histPartnerCount", { count: g.partner_count })}
                  </TableCell>
                </TableRow>
                {expanded
                  ? g.children.map((c, idx) => (
                      <TableRow
                        key={`${g.period_key}-${c.product_item_id}-${c.supplier_id ?? 0}-${idx}`}
                      >
                        <TableCell className="text-muted-foreground pl-8">
                          {c.date ? formatDate(c.date, locale) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{c.name || "—"}</div>
                          <div className="text-muted-foreground text-xs">
                            SKU : {c.sku || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {unitLabel(c.unit, tList)}
                          {c.lot_count > 0 && onOpenLots ? (
                            <div className="mt-1">
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto px-0"
                                onClick={() => onOpenLots(c)}
                              >
                                Lot ({c.lot_count})
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                        <MetricCells m={c.metrics} profitLabel={profitLabel} />
                        <TableCell>{c.supplier_name || "—"}</TableCell>
                      </TableRow>
                    ))
                  : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function unitLabel(
  unit: string,
  tList: ReturnType<typeof useTranslations<"productList">>
) {
  const u = (unit || "piece").toLowerCase();
  if (u === "box") return tList("packUnitBox");
  if (u === "set") return tList("packUnitSet");
  return tList("packUnitPiece");
}
