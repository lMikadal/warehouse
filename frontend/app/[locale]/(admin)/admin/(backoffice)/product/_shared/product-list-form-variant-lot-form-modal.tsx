"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
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
import { Switch } from "@/components/ui/switch";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  createProductItemStock,
  fetchProductItemWarehousePlacements,
  type ListItemBody,
  type ProductListApiError,
  type ProductItemStockRow,
  updateProductItemStock,
} from "@/lib/product-list-api";

import {
  filterComboboxToListSuppliers,
  warehousePlacementBinOptions,
} from "./product-list-form-lot-utils";

type Props = {
  mode: "add" | "edit";
  item: ListItemBody;
  listSupplierIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadSuppliers: (ctx: RemoteComboboxLoadContext) => Promise<
    { value: string; label: string }[]
  >;
  editRow?: ProductItemStockRow | null;
  onSaved: () => void;
};

function todayDateInput(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function receivedAtToDateInput(iso?: string | null): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function dateInputToReceivedAt(date: string): string {
  const t = date.trim();
  if (!t) return "";
  return new Date(`${t}T12:00:00`).toISOString();
}

export function ProductListFormVariantLotFormModal({
  mode,
  item,
  listSupplierIds,
  open,
  onOpenChange,
  loadSuppliers,
  editRow,
  onSaved,
}: Props) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tCrud = useTranslations("crud");
  const tFormPh = useTranslations("form");
  const tError = useTranslations("error");

  const [binId, setBinId] = useState(0);
  const [binOptions, setBinOptions] = useState<{ value: string; label: string }[]>(
    []
  );
  const [received, setReceived] = useState(todayDateInput());
  const [supplierId, setSupplierId] = useState("");
  const [poSku, setPoSku] = useState("");
  const [orderQty, setOrderQty] = useState("0");
  const [freeGift, setFreeGift] = useState("0");
  const [quantity, setQuantity] = useState("");
  const [remain, setRemain] = useState("");
  const [cost, setCost] = useState("");
  const [discount, setDiscount] = useState("0");
  const [sell, setSell] = useState("");
  const [isUsed, setIsUsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadSuppliersFiltered = useMemo(
    () => async (ctx: RemoteComboboxLoadContext) => {
      const opts = await loadSuppliers(ctx);
      return filterComboboxToListSuppliers(opts, listSupplierIds);
    },
    [loadSuppliers, listSupplierIds]
  );

  const loadBinOptions = useMemo(
    () => async (_ctx: RemoteComboboxLoadContext) => binOptions,
    [binOptions]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const draftBins = item.warehouse_placements ?? [];
      if (item.id == null) {
        if (!cancelled) setBinOptions(warehousePlacementBinOptions([], draftBins));
        return;
      }
      try {
        const rows = await fetchProductItemWarehousePlacements(locale, item.id);
        if (!cancelled) {
          setBinOptions(warehousePlacementBinOptions(rows, draftBins));
        }
      } catch {
        if (!cancelled) {
          setBinOptions(warehousePlacementBinOptions([], draftBins));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, item.id, item.warehouse_placements, locale]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editRow) {
      setBinId(editRow.bin_id);
      setReceived(receivedAtToDateInput(editRow.received_at) || todayDateInput());
      setSupplierId(
        editRow.supplier_user_id != null ? String(editRow.supplier_user_id) : ""
      );
      setPoSku(editRow.po_sku?.trim() ?? "");
      setOrderQty(String(editRow.order_quantity ?? 0));
      setFreeGift(String(editRow.order_free_gift ?? 0));
      setQuantity(String(editRow.quantity ?? ""));
      setRemain(String(editRow.remain_quantity ?? ""));
      setCost(String(editRow.cost_per_unit ?? ""));
      setDiscount(String(editRow.discount_per_unit ?? 0));
      setSell(String(editRow.sell_price ?? ""));
      setIsUsed(editRow.is_used);
    } else {
      setBinId(0);
      setReceived(todayDateInput());
      setSupplierId("");
      setPoSku("");
      setOrderQty("0");
      setFreeGift("0");
      setQuantity("");
      setRemain("");
      setCost("");
      setDiscount("0");
      setSell("");
      setIsUsed(false);
    }
    setFieldErrors({});
  }, [open, mode, editRow]);

  const binReadOnlyLabel =
    mode === "edit" && editRow
      ? editRow.bin_sku?.trim() || editRow.bin_label || "—"
      : "";

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (mode === "add" && binId <= 0) err.bin = tError("required");
    if (!received.trim()) err.received = tError("required");
    if (!quantity.trim()) err.quantity = tError("required");
    if (!remain.trim()) err.remain = tError("required");
    if (!cost.trim()) err.cost = tError("required");
    if (!sell.trim()) err.sell = tError("required");
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const submit = async () => {
    if (item.id == null || !validate()) return;
    if (mode === "edit" && !editRow) return;
    setSaving(true);
    try {
      if (mode === "add") {
        await createProductItemStock(item.id, {
          bin_id: binId,
          supplier_user_id: supplierId ? Number(supplierId) : null,
          order_quantity: Number(orderQty) || 0,
          order_free_gift: Number(freeGift) || 0,
          quantity: Number(quantity) || 0,
          remain_quantity: Number(remain) || Number(quantity) || 0,
          cost_per_unit: Number(cost) || 0,
          discount_per_unit: Number(discount) || 0,
          sell_price: Number(sell) || 0,
          is_used: isUsed,
          received_at: received,
          po_sku: poSku.trim() || undefined,
        });
      } else {
        await updateProductItemStock(item.id, editRow!.id, {
          order_quantity: Number(orderQty) || 0,
          order_free_gift: Number(freeGift) || 0,
          quantity: Number(quantity) || 0,
          remain_quantity: Number(remain) || 0,
          cost_per_unit: Number(cost) || 0,
          discount_per_unit: Number(discount) || 0,
          sell_price: Number(sell) || 0,
          is_used: isUsed,
          po_sku: poSku.trim(),
          received_at: dateInputToReceivedAt(received),
          supplier_user_id: supplierId ? Number(supplierId) : null,
        });
      }
      toast.success(tCrud("toast.saved"));
      onOpenChange(false);
      onSaved();
    } catch (e) {
      const err = e as ProductListApiError;
      if (err.status === 409) {
        toast.error(tForm("itemLotBinTaken"));
      } else {
        toast.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const title =
    mode === "edit" ? tForm("itemLotEditDialogTitle") : tForm("itemLotAddDialogTitle");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(42rem,calc(100vw-2rem))] sm:max-w-[42rem]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>
              {tForm("itemLotFieldBin")}
              {mode === "add" ? (
                <span className="text-destructive ml-0.5" aria-hidden="true">
                  *
                </span>
              ) : null}
            </Label>
            {mode === "edit" ? (
              <Input readOnly value={binReadOnlyLabel} className="bg-muted/30" />
            ) : (
              <RemoteComboboxField
                label=""
                value={binId > 0 ? String(binId) : ""}
                onValueChange={(v) => setBinId(v ? Number(v) : 0)}
                placeholder={tFormPh("placeholder.select", {
                  label: tForm("itemLotFieldBin"),
                })}
                emptyLabel={tError("noData")}
                onLoadOptions={loadBinOptions}
                inputClassName="w-full"
              />
            )}
            {fieldErrors.bin ? (
              <p className="text-destructive text-sm">{fieldErrors.bin}</p>
            ) : null}
          </div>
          <div className="form-field space-y-2">
            <Label htmlFor="lot-form-received">
              {tForm("itemLotColReceived")}
              <span className="text-destructive ml-0.5" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="lot-form-received"
              type="date"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
            />
            {fieldErrors.received ? (
              <p className="text-destructive text-sm">{fieldErrors.received}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lot-form-partner">{tForm("itemLotColPartner")}</Label>
              <RemoteComboboxField
                id="lot-form-partner"
                label={tForm("itemLotColPartner")}
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder={tFormPh("placeholder.select", {
                  label: tForm("itemLotColPartner"),
                })}
                emptyLabel={tError("noData")}
                onLoadOptions={loadSuppliersFiltered}
                showClear
                inputClassName="w-full"
                pinnedItems={
                  supplierId
                    ? [{ value: supplierId, label: supplierId }]
                    : []
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-form-po">{tForm("itemLotFieldPoSku")}</Label>
              <Input
                id="lot-form-po"
                type="text"
                className="font-mono text-sm"
                value={poSku}
                placeholder={tFormPh("placeholder.input", {
                  label: tForm("itemLotFieldPoSku"),
                })}
                onChange={(e) => setPoSku(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField
              id="lot-form-order"
              label={tForm("itemLotColOrderQty")}
              value={orderQty}
              onChange={setOrderQty}
            />
            <NumField
              id="lot-form-free"
              label={tForm("itemLotColFreeGift")}
              value={freeGift}
              onChange={setFreeGift}
            />
            <NumField
              id="lot-form-qty"
              label={tForm("itemLotColReceivedQty")}
              value={quantity}
              onChange={setQuantity}
              required
              error={fieldErrors.quantity}
            />
            <NumField
              id="lot-form-remain"
              label={tForm("itemLotColRemain")}
              value={remain}
              onChange={setRemain}
              required
              error={fieldErrors.remain}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumField
              id="lot-form-cost"
              label={tForm("itemLotColCost")}
              value={cost}
              onChange={setCost}
              required
              error={fieldErrors.cost}
            />
            <NumField
              id="lot-form-disc"
              label={tForm("itemLotColDiscountUnit")}
              value={discount}
              onChange={setDiscount}
            />
            <NumField
              id="lot-form-sell"
              label={tForm("itemLotColSell")}
              value={sell}
              onChange={setSell}
              required
              error={fieldErrors.sell}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="lot-form-used">{tForm("itemLotFieldIsUsed")}</Label>
            <Switch
              id="lot-form-used"
              checked={isUsed}
              onCheckedChange={setIsUsed}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCrud("btn.cancel")}
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {tCrud("btn.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumField({
  id,
  label,
  value,
  onChange,
  required,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  const tFormPh = useTranslations("form");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      <Input
        id={id}
        type="number"
        step="any"
        value={value}
        placeholder={tFormPh("placeholder.input", { label })}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
