"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import {
  fetchPurchaseStockHistory,
  type PurchaseStockHistoryRow,
} from "@/lib/order-purchase-api";
import { cn } from "@/lib/utils";

export type PurchaseStockHistoryTarget = {
  productItemId: number;
  productName: string;
  supplierUserId?: number | null;
};

export type PurchaseStockHistoryDialogProps = {
  target: PurchaseStockHistoryTarget | null;
  onOpenChange: (open: boolean) => void;
  /** When set, rows with a supplier become clickable assign shortcuts. */
  onSelectRow?: (row: PurchaseStockHistoryRow) => void;
};

/** v1 "stock history" popup: the last receipts of one product item, optionally from one supplier. */
export function PurchaseStockHistoryDialog({
  target,
  onOpenChange,
  onSelectRow,
}: PurchaseStockHistoryDialogProps) {
  const locale = useLocale() as DisplayLocale;
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tReceive = useTranslations("page.orderPurchase.receive");
  const tError = useTranslations("error");
  const tApprove = useTranslations("page.orderPurchase.approve");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PurchaseStockHistoryRow[]>([]);

  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();
    setLoading(true);
    setRows([]);
    fetchPurchaseStockHistory({
      product_item_id: target.productItemId,
      supplier_user_id: target.supplierUserId ?? null,
      limit: 20,
      signal: controller.signal,
    })
      .then((res) => setRows(res.items))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        toast.error(e instanceof Error ? e.message : tError("loadFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [target, tError]);

  const money = (n: number) =>
    n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{tDetail("stockHistoryTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{target?.productName}</p>
        {onSelectRow ? (
          <p className="text-xs text-muted-foreground">
            {tReceive("stockHistorySelectHint")}
          </p>
        ) : null}
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {tError("noData")}
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tDetail("colStockReceivedAt")}</TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tDetail("colStockQuantity")}
                  </TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tDetail("colStockRemain")}
                  </TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tDetail("colStockCost")}
                  </TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tDetail("colStockSellPrice")}
                  </TableHead>
                  <TableHead>{tApprove("partnerLabel")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const selectable =
                    onSelectRow != null &&
                    row.supplier_user_id != null &&
                    row.supplier_user_id > 0;
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(selectable && "cursor-pointer hover:bg-muted/50")}
                      aria-label={
                        selectable
                          ? tReceive("stockHistorySelectAria")
                          : undefined
                      }
                      onClick={() => {
                        if (selectable) onSelectRow(row);
                      }}
                    >
                      <TableCell>
                        {formatDateTime(
                          row.received_at ?? row.created_at,
                          locale
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.remain_quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.cost_per_unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.sell_price)}
                      </TableCell>
                      <TableCell>
                        {row.supplier_name?.trim() || tDetail("emptyCell")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
