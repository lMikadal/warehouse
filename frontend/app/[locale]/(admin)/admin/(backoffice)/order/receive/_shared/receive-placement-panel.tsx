"use client";

import { Package, Plus, Trash2, Warehouse } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PurchaseItemDetail } from "@/lib/order-purchase-api";
import {
  fetchReceiveBins,
  OrderReceiveApiError,
  receiveItem,
  type ReceiveBinOption,
} from "@/lib/order-receive-api";
import { cn } from "@/lib/utils";

import { priceIncVat } from "../../purchase/_lib/purchase-totals";

type PlacementDraft = { binId: string; qty: string };

const emptyDraft: PlacementDraft = { binId: "", qty: "" };

function parseQty(raw: string): number {
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseMoney(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

export type ReceivePlacementPanelProps = {
  purchaseId: number;
  item: PurchaseItemDetail | null;
  vatRate: number;
  disabled?: boolean;
  onReceived: () => void;
};

/**
 * Right pane of the receive screen. v1 walked a warehouse → zone → shelf → rack → bin cascade; the
 * warehouse only ever stores stock in a bin, so the picker is a single searchable bin field that
 * shows the derived path, and the backend rejects a bin that is full or already holds another item.
 */
export function ReceivePlacementPanel({
  purchaseId,
  item,
  vatRate,
  disabled = false,
  onReceived,
}: ReceivePlacementPanelProps) {
  const locale = useLocale();
  const t = useTranslations("page.orderReceive.proceed");
  const tPage = useTranslations("page.orderReceive");

  const [placements, setPlacements] = useState<PlacementDraft[]>([emptyDraft]);
  const [bonusQty, setBonusQty] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellPriceVat, setSellPriceVat] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Remembers what the picker offered so free capacity can be checked before hitting the API.
  const binCache = useRef(new Map<string, ReceiveBinOption>());

  const productItemId = item?.product_item_id ?? null;

  useEffect(() => {
    binCache.current.clear();
    setPlacements([emptyDraft]);
    setBonusQty(item?.free_gift ? String(item.free_gift) : "");
    setNote("");
    // v1 seeded the sell price from the purchase price so the desk only tweaks it.
    const base = item?.price_per_unit ?? 0;
    setSellPrice(base > 0 ? base.toFixed(2) : "");
    setSellPriceVat(base > 0 ? priceIncVat(base, vatRate).toFixed(2) : "");
  }, [item?.id, item?.free_gift, item?.price_per_unit, vatRate]);

  const loadBins = useCallback(
    async (ctx: { search: string; signal?: AbortSignal }) => {
      if (productItemId == null) return [];
      const res = await fetchReceiveBins({
        product_item_id: productItemId,
        search: ctx.search.trim() || undefined,
        signal: ctx.signal,
      });
      for (const bin of res.items) binCache.current.set(String(bin.id), bin);
      return res.items.map((bin) => ({
        value: String(bin.id),
        label: `${bin.path} / ${bin.name} · ${t("binFreeCapacity", {
          free: bin.free,
          capacity: bin.capacity,
        })}`,
      }));
    },
    [productItemId, t]
  );

  const orderedQty = item?.qty ?? 0;
  const bonus = parseQty(bonusQty);
  const placedQty = placements.reduce((sum, p) => sum + parseQty(p.qty), 0);
  const maxQty = orderedQty + bonus;

  const setPlacement = (index: number, patch: Partial<PlacementDraft>) => {
    setPlacements((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  };

  const onSellPriceChange = (raw: string) => {
    setSellPrice(raw);
    const n = parseMoney(raw);
    setSellPriceVat(Number.isFinite(n) ? priceIncVat(n, vatRate).toFixed(2) : "");
  };

  const submit = async () => {
    if (!item) return;
    const price = parseMoney(sellPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error(t("errSellPriceRequired"));
      return;
    }
    const rows = placements
      .map((p) => ({ bin_id: Number(p.binId), stock_qty: parseQty(p.qty) }))
      .filter((p) => Number.isFinite(p.bin_id) && p.bin_id > 0 && p.stock_qty > 0);
    if (rows.length === 0) {
      toast.error(t("errPlacementRequired"));
      return;
    }
    if (rows.reduce((s, r) => s + r.stock_qty, 0) > maxQty) {
      toast.error(t("placementTotalMismatch"));
      return;
    }
    for (const row of rows) {
      const bin = binCache.current.get(String(row.bin_id));
      if (bin && row.stock_qty > bin.free) {
        toast.error(t("capacityPlacementExceeds"));
        return;
      }
    }
    setSubmitting(true);
    try {
      await receiveItem(locale, purchaseId, item.id, {
        sell_price: price,
        sell_price_vat: parseMoney(sellPriceVat) || priceIncVat(price, vatRate),
        bonus_qty: bonus,
        note: note.trim(),
        placements: rows,
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
        <p className="mt-2 text-xs text-muted-foreground">{t("selectWarehouseHint")}</p>
      </div>
    );
  }

  const alreadyReceived = item.status === "receive_approved";
  const locked = disabled || alreadyReceived;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Warehouse className="size-5 shrink-0 text-primary" aria-hidden />
        <h2 className="text-base font-semibold">{t("selectWarehouseTitle")}</h2>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-y-2 border-b pb-4 text-sm">
        <span className="text-muted-foreground">{t("selectedName")}</span>
        <span className="text-right font-medium">
          {item.product_item_name?.trim() || item.name?.trim() || t("emptyCell")}
        </span>
        <span className="text-muted-foreground">{t("selectedSku")}</span>
        <span className="text-right tabular-nums">
          {item.product_item_sku?.trim() || t("emptyCell")}
        </span>
        <span className="text-muted-foreground">{t("selectedQty")}</span>
        <span className="text-right font-medium tabular-nums">
          {`${orderedQty.toLocaleString()} ${tPage(`unit.${item.unit}`)}`}
        </span>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">{t("binOnlyHint")}</p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>{t("placementsHeading")}</Label>
          {placements.map((row, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <RemoteComboboxField
                  id={`receive-bin-${index}`}
                  label={t("binPathLabel")}
                  value={row.binId}
                  onValueChange={(v) => setPlacement(index, { binId: v })}
                  placeholder={t("binPlaceholder")}
                  emptyLabel={t("binEmpty")}
                  inputClassName="w-full min-w-0"
                  showClear
                  catalogKey={productItemId ?? 0}
                  disabled={locked}
                  onLoadOptions={loadBins}
                />
              </div>
              <Input
                className="w-24 text-right tabular-nums"
                inputMode="numeric"
                aria-label={t("placementQtyLabel")}
                value={row.qty}
                onChange={(e) => setPlacement(index, { qty: e.target.value })}
                disabled={locked}
              />
              {placements.length > 1 ? (
                <ButtonIcon
                  tone="delete"
                  aria-label={t("removePlacement")}
                  onClick={() =>
                    setPlacements((prev) => prev.filter((_, i) => i !== index))
                  }
                  disabled={locked}
                >
                  <Trash2 className="size-4" />
                </ButtonIcon>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setPlacements((prev) => [...prev, emptyDraft])}
            disabled={locked}
          >
            <Plus className="size-4" />
            {t("addPlacement")}
          </Button>
          <p
            className={cn(
              "text-xs tabular-nums",
              placedQty > maxQty ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {`${placedQty.toLocaleString()} / ${maxQty.toLocaleString()} ${tPage(`unit.${item.unit}`)}`}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="receive-bonus-qty">{t("bonusQtyLabel")}</Label>
          <Input
            id="receive-bonus-qty"
            inputMode="numeric"
            className="text-right tabular-nums"
            placeholder={t("bonusPlaceholder")}
            value={bonusQty}
            onChange={(e) => setBonusQty(e.target.value)}
            disabled={locked}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="receive-sell-price">{t("sellPriceLabel")}</Label>
          <Input
            id="receive-sell-price"
            inputMode="decimal"
            className="text-right tabular-nums"
            value={sellPrice}
            onChange={(e) => onSellPriceChange(e.target.value)}
            disabled={locked}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="receive-sell-price-vat">{t("sellPriceVatLabel")}</Label>
          <Input
            id="receive-sell-price-vat"
            inputMode="decimal"
            className="text-right tabular-nums"
            value={sellPriceVat}
            onChange={(e) => setSellPriceVat(e.target.value)}
            disabled={locked}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="receive-note">{t("rejectNoteLabel")}</Label>
          <Textarea
            id="receive-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("rejectDialog.notePlaceholder")}
            disabled={locked}
          />
        </div>

        <Button type="button" className="w-full" onClick={submit} disabled={locked || submitting}>
          {t("confirm")}
        </Button>
        {alreadyReceived ? (
          <p className="text-xs text-warehouse-success-fg">{t("progressReceived")}</p>
        ) : null}
      </div>
    </div>
  );
}
