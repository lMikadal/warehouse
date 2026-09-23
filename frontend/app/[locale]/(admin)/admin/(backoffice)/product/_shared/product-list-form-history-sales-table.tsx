"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

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
  SalesHistoryGroup,
  SalesHistoryMetrics,
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
  m: SalesHistoryMetrics;
  profitLabel: (pct: string) => string;
}) {
  const pct = Number.isFinite(m.profit_pct) ? m.profit_pct.toFixed(1) : null;
  return (
    <>
      <TableCell className="text-right tabular-nums">
        {formatQty(m.qty)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.net_cost_per_unit)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.net_sell_per_unit)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.net_sell_total)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(m.net_profit_per_unit)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <div className="flex flex-col items-end gap-0.5">
          <span>{formatMoney(m.net_profit_total)}</span>
          {pct != null ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {profitLabel(pct)}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {pct != null ? `${pct}%` : "—"}
      </TableCell>
    </>
  );
}

type Props = {
  groupBy: HistoryGroupBy;
  groups: SalesHistoryGroup[];
};

export function ProductListFormHistorySalesTable({ groupBy, groups }: Props) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (key: string) => open[key] !== false;
  const profitLabel = (pct: string) =>
    tForm("itemLotProfitPctLine", { pct });

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {tForm("histSalesEmpty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2}>{tForm("histColSaleDate")}</TableHead>
            <TableHead rowSpan={2}>{tForm("histColBillNo")}</TableHead>
            <TableHead colSpan={1} className="text-center">
              {tForm("histSalesGroupProduct")}
            </TableHead>
            <TableHead colSpan={3} className="text-center">
              {tForm("histSalesGroupCost")}
            </TableHead>
            <TableHead colSpan={3} className="text-center">
              {tForm("histSalesGroupProfit")}
            </TableHead>
            <TableHead rowSpan={2}>{tForm("histColCustomer")}</TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="text-right">{tForm("histColQty")}</TableHead>
            <TableHead className="text-right">
              {tForm("histColNetCostPerUnit")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColNetSellPerUnit")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColNetSellTotal")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColNetProfitPerUnit")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColNetProfitTotal")}
            </TableHead>
            <TableHead className="text-right">
              {tForm("histColProfitPct")}
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
                  <MetricCells m={g.metrics} profitLabel={profitLabel} />
                  <TableCell>
                    {tForm("histPartnerCount", { count: g.partner_count })}
                  </TableCell>
                </TableRow>
                {expanded
                  ? g.children.map((c, idx) => (
                      <TableRow
                        key={`${g.period_key}-${c.bill_no}-${c.product_item_id}-${idx}`}
                      >
                        <TableCell className="text-muted-foreground pl-8">
                          {c.date ? formatDate(c.date, locale) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{c.bill_no || "—"}</div>
                          <div className="text-muted-foreground text-xs">
                            {c.name || "—"} · SKU : {c.sku || "—"}
                          </div>
                        </TableCell>
                        <MetricCells m={c.metrics} profitLabel={profitLabel} />
                        <TableCell>{c.customer || "—"}</TableCell>
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
