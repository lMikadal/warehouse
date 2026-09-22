"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PurchaseItemDetail } from "@/lib/order-purchase-api";
import { cn } from "@/lib/utils";

import { lineNet } from "../_lib/purchase-totals";
import { purchaseItemStatusPillClass } from "./purchase-status-styles";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type PurchaseItemsTableProps = {
  items: PurchaseItemDetail[];
  /** Extra trailing column (approve toggles, receive inputs, …) rendered per row. */
  renderActions?: (item: PurchaseItemDetail) => ReactNode;
  actionsHeader?: ReactNode;
  /** Receive desk: clicking a row loads it into the placement panel beside the table. */
  selectedItemId?: number | null;
  onSelectItem?: (item: PurchaseItemDetail) => void;
  /** Extra markup under the product name (placement summary, reject note, …). */
  renderProductExtra?: (item: PurchaseItemDetail) => ReactNode;
};

/** Line table shared by the PO detail, approve and payment screens. */
export function PurchaseItemsTable({
  items,
  renderActions,
  actionsHeader,
  selectedItemId = null,
  onSelectItem,
  renderProductExtra,
}: PurchaseItemsTableProps) {
  const locale = useLocale();
  const tPage = useTranslations("page.orderPurchase");
  const tApprove = useTranslations("page.orderPurchase.approve");
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tPo = useTranslations("page.orderPurchase.po");
  const tForm = useTranslations("page.orderPurchase.form");
  const columnCount = renderActions ? 9 : 8;

  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead className="min-w-[220px]">{tForm("colProduct")}</TableHead>
            <TableHead className="text-center">{tForm("colQty")}</TableHead>
            <TableHead className="text-center">{tForm("colUnit")}</TableHead>
            <TableHead className="text-right tabular-nums">
              {tForm("colPricePerUnit")}
            </TableHead>
            <TableHead className="text-right tabular-nums">
              {tForm("colLineDiscount")}
            </TableHead>
            <TableHead className="text-right tabular-nums">
              {tForm("colLineNet")}
            </TableHead>
            <TableHead className="text-center">{tPo("colStatus")}</TableHead>
            {renderActions ? (
              <TableHead className="text-center">{actionsHeader}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center">
                {tDetail("emptyItems")}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, index) => {
              const rejected =
                item.status === "rejected" || item.status === "receive_rejected";
              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    rejected && "bg-warehouse-error-bg/40",
                    onSelectItem && "cursor-pointer",
                    selectedItemId === item.id && "bg-primary/10"
                  )}
                  onClick={onSelectItem ? () => onSelectItem(item) : undefined}
                >
                  <TableCell className="text-center tabular-nums">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">
                        {item.product_item_name?.trim() ||
                          item.name?.trim() ||
                          "—"}
                      </span>
                      {item.product_item_sku?.trim() ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {item.product_item_sku}
                        </span>
                      ) : null}
                      {/* A split line points back at the unit it was carved out of. */}
                      {item.parent_id != null && item.old_unit ? (
                        <span className="text-xs text-muted-foreground">
                          {tApprove("splitLineBadge", {
                            qty: item.old_qty ?? 0,
                            unit: tPage(`unit.${item.old_unit}`),
                          })}
                        </span>
                      ) : null}
                      {item.note.trim() ? (
                        <span className="text-xs text-muted-foreground">
                          {item.note}
                        </span>
                      ) : null}
                      {renderProductExtra?.(item)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {item.qty.toLocaleString()}
                    {item.free_gift > 0 ? (
                      <span className="ml-1 text-xs text-warehouse-success-fg">
                        +{item.free_gift}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    {tPage(`unit.${item.unit}`)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(item.price_per_unit, locale)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(item.discount, locale)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(
                      lineNet({
                        qty: item.qty,
                        price_per_unit: item.price_per_unit,
                        discount: item.discount,
                      }),
                      locale
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={purchaseItemStatusPillClass(item.status)}>
                      {tPage(`itemStatus.${item.status}`)}
                    </span>
                  </TableCell>
                  {renderActions ? (
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {renderActions(item)}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
