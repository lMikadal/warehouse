"use client";

import { Package, Warehouse } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PurchaseItemDetail } from "@/lib/order-purchase-api";
import {
  OrderReceiveApiError,
  receiveItem,
} from "@/lib/order-receive-api";

import { priceIncVat } from "../../purchase/_lib/purchase-totals";
import { WarehousePlacementCascadeRow } from "../../../product/_shared/product-list-form-warehouse-placement-row";

function parseQty(raw: string): number {
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export type ReceivePlacementPanelProps = {
  purchaseId: number;
  item: PurchaseItemDetail | null;
  vatRate: number;
  disabled?: boolean;
  onCancel: () => void;
  onReceived: () => void;
};

/**
 * Right pane: warehouse cascade ends in a bin (UI only). Persist bin_id + qty via receive API.
 * Sell prices are seeded from the PO line and sent hidden (required by the backend).
 */
export function ReceivePlacementPanel({
  purchaseId,
  item,
  vatRate,
  disabled = false,
  onCancel,
  onReceived,
}: ReceivePlacementPanelProps) {
  const locale = useLocale();
  const t = useTranslations("page.orderReceive.proceed");
  const tPage = useTranslations("page.orderReceive");

  const [binId, setBinId] = useState(0);
  const [stockQty, setStockQty] = useState("");
  const [bonusQty, setBonusQty] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBinId(0);
    setStockQty(item?.qty ? String(item.qty) : "");
    setBonusQty(item?.free_gift ? String(item.free_gift) : "0");
  }, [item?.id, item?.qty, item?.free_gift]);

  if (!item) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10"
            aria-hidden
          >
            <Package className="size-[1.125rem] text-primary" />
          </span>
          <h2 className="text-base font-semibold">{t("selectWarehouseTitle")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("warehousePanelEmptyHint")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("selectWarehouseHint")}
        </p>
      </div>
    );
  }

  const alreadyReceived = item.status === "receive_approved";
  const locked = disabled || alreadyReceived;
  const orderedQty = item.qty ?? 0;
  const unitLabel = tPage(`unit.${item.unit}`);
  const productName =
    item.product_item_name?.trim() || item.name?.trim() || t("emptyCell");
  const productSku = item.product_item_sku?.trim() || t("emptyCell");

  const submit = async () => {
    if (binId <= 0) {
      toast.error(t("errPlacementRequired"));
      return;
    }
    const qty = parseQty(stockQty);
    if (qty < 1) {
      toast.error(t("errPlacementRequired"));
      return;
    }
    const bonus = parseQty(bonusQty);
    const maxQty = orderedQty + bonus;
    if (qty > maxQty) {
      toast.error(t("placementTotalMismatch"));
      return;
    }
    const base = item.price_per_unit ?? 0;
    const sellPrice = base > 0 ? base : 0.01;
    setSubmitting(true);
    try {
      await receiveItem(locale, purchaseId, item.id, {
        sell_price: sellPrice,
        sell_price_vat: priceIncVat(sellPrice, vatRate),
        bonus_qty: bonus,
        note: "",
        placements: [{ bin_id: binId, stock_qty: qty }],
      });
      toast.success(t("confirmSuccess"));
      onReceived();
    } catch (e) {
      toast.error(
        e instanceof OrderReceiveApiError ? e.message : t("confirmFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Warehouse className="size-5 shrink-0 text-primary" aria-hidden />
        <h2 className="text-base font-semibold">{t("selectWarehouseTitle")}</h2>
      </div>

      <div className="mb-4 space-y-1 border-b pb-4 text-sm">
        <p className="font-medium">{productName}</p>
        <p className="text-muted-foreground tabular-nums">
          {t("selectedSku")}: {productSku}
        </p>
        {item.brand_name?.trim() ? (
          <p className="text-muted-foreground">
            {t("selectedBrand")}: {item.brand_name.trim()}
          </p>
        ) : null}
        <p className="font-medium tabular-nums">
          {t("selectedQty")} {orderedQty.toLocaleString()} {unitLabel}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <WarehousePlacementCascadeRow
          layout="stack"
          binId={binId}
          onBinChange={setBinId}
          disabled={locked}
        />

        <div className="grid gap-1.5">
          <Label htmlFor="receive-stock-qty">
            {t("placementQtyLabel")}
            <span className="text-destructive" aria-hidden>
              {" "}
              *
            </span>
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="receive-stock-qty"
              inputMode="numeric"
              className="text-right tabular-nums"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              disabled={locked}
              placeholder={t("bonusPlaceholder")}
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              {unitLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="receive-bonus-qty">{t("bonusQtyLabel")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="receive-bonus-qty"
              inputMode="numeric"
              className="text-right tabular-nums"
              placeholder={t("bonusPlaceholder")}
              value={bonusQty}
              onChange={(e) => setBonusQty(e.target.value)}
              disabled={locked}
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              {unitLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={submitting}
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={locked || submitting}
          onClick={() => void submit()}
        >
          {alreadyReceived ? t("editWarehouseSubmit") : t("confirm")}
        </Button>
      </div>
      {alreadyReceived ? (
        <p className="mt-2 text-xs text-warehouse-success-fg">
          {t("progressReceived")}
        </p>
      ) : null}
    </div>
  );
}
