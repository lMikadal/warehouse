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
import { type DisplayLocale } from "@/lib/format-datetime";
import {
  OrderPurchaseApiError,
  updatePurchaseItem,
  type PurchaseItemDetail,
} from "@/lib/order-purchase-api";

import {
  clampLineDiscount,
  priceExVat,
  priceIncVat,
  roundMoney,
} from "../_lib/purchase-totals";

/**
 * v1 lets the buyer retouch an approved line right before paying: qty, price and line discount.
 * The ex-VAT and inc-VAT prices are two views of one number, so editing either updates the other.
 */
export function PurchaseLineEditDialog({
  purchaseId,
  item,
  onOpenChange,
  onSaved,
}: {
  purchaseId: number;
  item: PurchaseItemDetail | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const locale = useLocale() as DisplayLocale;
  const tApprove = useTranslations("page.orderPurchase.approve");
  const tForm = useTranslations("page.orderPurchase.form");
  const tError = useTranslations("error");

  const [qty, setQty] = useState("1");
  const [priceEx, setPriceEx] = useState("0");
  const [priceInc, setPriceInc] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQty(String(item.qty));
    setPriceEx(String(item.price_per_unit));
    setPriceInc(String(priceIncVat(item.price_per_unit, item.vat_rate)));
    setDiscount(String(item.discount));
  }, [item]);

  const qtyNum = Math.max(0, Math.floor(Number(qty) || 0));
  const priceExNum = Math.max(0, Number(priceEx) || 0);
  const clampedDiscount = clampLineDiscount(
    qtyNum,
    priceExNum,
    Number(discount) || 0
  );
  const net = roundMoney(qtyNum * priceExNum - clampedDiscount);

  const save = async () => {
    if (!item || qtyNum < 1) {
      toast.error(tForm("errorQtyRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await updatePurchaseItem(locale, purchaseId, item.id, {
        type: item.type,
        product_item_id: item.product_item_id ?? null,
        name: item.name ?? null,
        product_attribute_brand_id: item.product_attribute_brand_id ?? null,
        product_attribute_model_id: item.product_attribute_model_id ?? null,
        product_attribute_engine_id: item.product_attribute_engine_id ?? null,
        identification_number: item.identification_number,
        qty: qtyNum,
        free_gift: item.free_gift,
        unit: item.unit,
        price_per_unit: roundMoney(priceExNum),
        vat_rate: item.vat_rate,
        discount: clampedDiscount,
        note: item.note,
        system_file_ids: item.files.map((f) => f.system_file_id),
      });
      toast.success(tApprove("editSaveSuccess"));
      onOpenChange(false);
      onSaved();
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
          <DialogTitle>{tApprove("editDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="purchase-line-qty">{tApprove("editQtyLabel")}</Label>
            <Input
              id="purchase-line-qty"
              inputMode="numeric"
              className="tabular-nums"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="purchase-line-price-ex">
                {tApprove("editPriceExVatLabel")}
              </Label>
              <Input
                id="purchase-line-price-ex"
                inputMode="decimal"
                className="tabular-nums"
                value={priceEx}
                onChange={(e) => {
                  setPriceEx(e.target.value);
                  setPriceInc(
                    String(
                      priceIncVat(Number(e.target.value) || 0, item?.vat_rate ?? 0)
                    )
                  );
                }}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="purchase-line-price-inc">
                {tApprove("editPriceIncVatLabel")}
              </Label>
              <Input
                id="purchase-line-price-inc"
                inputMode="decimal"
                className="tabular-nums"
                value={priceInc}
                onChange={(e) => {
                  setPriceInc(e.target.value);
                  setPriceEx(
                    String(
                      priceExVat(Number(e.target.value) || 0, item?.vat_rate ?? 0)
                    )
                  );
                }}
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="purchase-line-discount">
              {tApprove("editDiscountLabel")}
            </Label>
            <Input
              id="purchase-line-discount"
              inputMode="decimal"
              className="tabular-nums"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
            {clampedDiscount !== (Number(discount) || 0) ? (
              <p className="text-xs text-warehouse-error-fg">
                {tForm("validationLineDiscount")}
              </p>
            ) : null}
          </div>
          <p className="rounded-md border bg-muted/40 p-3 text-sm tabular-nums">
            {tForm("colLineNet")}:{" "}
            {net.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tApprove("editCancel")}
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void save()}>
            {tApprove("editSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
