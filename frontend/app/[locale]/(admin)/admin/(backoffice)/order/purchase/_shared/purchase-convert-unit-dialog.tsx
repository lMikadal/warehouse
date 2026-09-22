"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type DisplayLocale } from "@/lib/format-datetime";
import {
  convertPurchaseItemUnit,
  OrderPurchaseApiError,
  type PurchaseItemDetail,
  type PurchaseUnit,
} from "@/lib/order-purchase-api";

import { convertedUnitQty } from "../_lib/purchase-totals";

const PURCHASE_UNITS: PurchaseUnit[] = ["piece", "box", "set"];

export type PurchaseConvertUnitDialogProps = {
  purchaseId: number;
  /** null closes the dialog; otherwise the line being split. */
  item: PurchaseItemDetail | null;
  onOpenChange: (open: boolean) => void;
  onConverted: () => void;
  /**
   * Defaults to the purchase endpoint. The receive desk passes its own so the call lands on
   * `/order/receives`, which is the resource its role is granted.
   */
  convert?: typeof convertPurchaseItemUnit;
};

/**
 * Splits part of a line into a new line expressed in another unit: `from_ratio` of the old unit
 * equals `to_ratio` of the new one, so `qty_to_convert` old packs become
 * round(qty × to_ratio ÷ from_ratio) new ones. The order total does not move — the split line
 * carries no price of its own.
 */
export function PurchaseConvertUnitDialog({
  purchaseId,
  item,
  onOpenChange,
  onConverted,
  convert = convertPurchaseItemUnit,
}: PurchaseConvertUnitDialogProps) {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.orderPurchase");
  const tApprove = useTranslations("page.orderPurchase.approve");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const [qty, setQty] = useState("1");
  const [fromRatio, setFromRatio] = useState("1");
  const [toRatio, setToRatio] = useState("1");
  const [targetUnit, setTargetUnit] = useState<PurchaseUnit>("piece");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQty("1");
    setFromRatio("1");
    setToRatio("1");
    // Default to a unit other than the line's own, since converting to itself is a no-op.
    setTargetUnit(item.unit === "piece" ? "box" : "piece");
  }, [item]);

  const qtyNum = Math.max(0, Math.floor(Number(qty) || 0));
  const fromNum = Math.max(0, Math.floor(Number(fromRatio) || 0));
  const toNum = Math.max(0, Math.floor(Number(toRatio) || 0));
  const resultQty = convertedUnitQty(qtyNum, fromNum, toNum);
  const valid =
    item != null &&
    qtyNum >= 1 &&
    qtyNum <= item.qty &&
    fromNum >= 1 &&
    toNum >= 1 &&
    resultQty >= 1;

  const submit = async () => {
    if (!item || !valid) return;
    setSubmitting(true);
    try {
      await convert(locale, purchaseId, item.id, {
        qty_to_convert: qtyNum,
        from_ratio: fromNum,
        to_ratio: toNum,
        target_unit: targetUnit,
      });
      toast.success(tApprove("convertUnitSuccess"));
      onOpenChange(false);
      onConverted();
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={item != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tApprove("convertUnitTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="convert-unit-qty">{tApprove("convertUnitQty")}</Label>
            <Input
              id="convert-unit-qty"
              inputMode="numeric"
              className="tabular-nums"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            {item ? (
              <p className="text-xs text-muted-foreground">
                {item.qty.toLocaleString()} {tPage(`unit.${item.unit}`)}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="convert-unit-from">
                {tApprove("convertUnitFromRatio")}
              </Label>
              <Input
                id="convert-unit-from"
                inputMode="numeric"
                className="tabular-nums"
                value={fromRatio}
                onChange={(e) => setFromRatio(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="convert-unit-to">
                {tApprove("convertUnitToRatio")}
              </Label>
              <Input
                id="convert-unit-to"
                inputMode="numeric"
                className="tabular-nums"
                value={toRatio}
                onChange={(e) => setToRatio(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="convert-unit-target">
              {tApprove("convertUnitTarget")}
            </Label>
            <Select
              value={targetUnit}
              onValueChange={(v) => setTargetUnit(v as PurchaseUnit)}
            >
              <SelectTrigger id="convert-unit-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {tPage(`unit.${unit}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="rounded-md border bg-muted/40 p-3 text-sm tabular-nums">
            {tApprove("convertUnitPreview", {
              qty: resultQty,
              unit: tPage(`unit.${targetUnit}`),
            })}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCrud("btn.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!valid || submitting}
            onClick={() => void submit()}
          >
            {tApprove("convertUnitSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
