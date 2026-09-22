"use client";

import {
  ChevronRight,
  PackageCheck,
  PackageX,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PurchaseItemDetail, PurchaseUnit } from "@/lib/order-purchase-api";
import {
  createReceiveReject,
  OrderReceiveApiError,
  type ReceiveRejectResolution,
  type ReceiveRejectType,
} from "@/lib/order-receive-api";
import {
  type ImageUploadItem,
  uploadSystemFile,
} from "@/lib/system-file-api";

import { priceIncVat } from "../../purchase/_lib/purchase-totals";

const MAX_IMAGES = 3;

/** v1 asked for the action first, then the detail. `receive_in` keeps the goods, the others send them back. */
type ActionKind = "receive_in" | "return" | "claim";

const ACTION_LIST: ActionKind[] = ["receive_in", "return", "claim"];

const ACTION_ICON: Record<ActionKind, { Icon: LucideIcon; iconBox: string }> = {
  receive_in: {
    Icon: PackageCheck,
    iconBox:
      "flex size-10 shrink-0 items-center justify-center rounded-md bg-warehouse-warning-bg text-warehouse-warning-fg",
  },
  return: {
    Icon: PackageX,
    iconBox:
      "flex size-10 shrink-0 items-center justify-center rounded-md bg-warehouse-error-bg text-warehouse-error-fg",
  },
  claim: {
    Icon: ShieldAlert,
    iconBox:
      "flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
  },
};

const REJECT_TYPES: ReceiveRejectType[] = [
  "overage",
  "shortage",
  "damaged",
  "wrong",
  "other",
];

const UNITS: PurchaseUnit[] = ["piece", "box", "set"];

function parseQty(raw: string): number {
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : NaN;
}

function parseMoney(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

export type ReceiveRejectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: number;
  item: PurchaseItemDetail | null;
  vatRate: number;
  onSubmitted: () => void;
};

export function ReceiveRejectDialog({
  open,
  onOpenChange,
  purchaseId,
  item,
  vatRate,
  onSubmitted,
}: ReceiveRejectDialogProps) {
  const locale = useLocale();
  const t = useTranslations("page.orderReceive.proceed.rejectDialog");
  const tPage = useTranslations("page.orderReceive");

  const [step, setStep] = useState<"type" | "form">("type");
  const [action, setAction] = useState<ActionKind>("receive_in");
  const [rejectType, setRejectType] = useState<ReceiveRejectType>("overage");
  const [overageChoice, setOverageChoice] = useState<"receive" | "return">(
    "receive"
  );
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<PurchaseUnit>("piece");
  const [price, setPrice] = useState("");
  const [priceVat, setPriceVat] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setStep("type");
    setAction("receive_in");
    setRejectType("overage");
    setOverageChoice("receive");
    setQty("");
    setUnit(item.unit);
    setPrice(item.price_per_unit > 0 ? item.price_per_unit.toFixed(2) : "");
    setPriceVat(
      item.price_per_unit > 0
        ? priceIncVat(item.price_per_unit, vatRate).toFixed(2)
        : ""
    );
    setNote("");
    setImages([]);
  }, [open, item, vatRate]);

  const actionLabel = (a: ActionKind) =>
    a === "receive_in"
      ? t("actionReceiveIn")
      : a === "return"
        ? t("actionReturn")
        : t("actionClaim");

  const actionDescription = (a: ActionKind) =>
    a === "receive_in"
      ? t("actionReceiveInDesc")
      : a === "return"
        ? t("actionReturnDesc")
        : t("actionClaimDesc");

  const typeLabel = useCallback((r: ReceiveRejectType) =>
    r === "overage"
      ? t("problemOverage")
      : r === "shortage"
        ? t("problemShortage")
        : r === "damaged"
          ? t("problemDamaged")
          : r === "wrong"
            ? t("problemWrong")
            : t("problemOther"), [t]);

  const typeOptions = useMemo(
    () =>
      // Receiving the goods anyway only makes sense for a count mismatch, as in v1.
      (action === "receive_in"
        ? (["overage", "shortage"] as ReceiveRejectType[])
        : REJECT_TYPES
      ).map((r) => ({ value: r, label: typeLabel(r) })),
    [action, typeLabel]
  );

  const unitOptions = useMemo(
    () => UNITS.map((u) => ({ value: u, label: tPage(`unit.${u}`) })),
    [tPage]
  );

  const onPriceChange = (raw: string) => {
    setPrice(raw);
    const n = parseMoney(raw);
    setPriceVat(Number.isFinite(n) ? priceIncVat(n, vatRate).toFixed(2) : "");
  };

  const resolution = (): ReceiveRejectResolution => {
    if (action === "claim") return "claim";
    if (action === "return") return "return";
    // Keeping what arrived: the difference is written off rather than sent back.
    return "accept_loss";
  };

  const submit = async () => {
    if (!item) return;
    const qtyValue = parseQty(qty);
    if (!Number.isFinite(qtyValue) || qtyValue < 1) {
      toast.error(qty.trim() ? t("errQtyMin") : t("errQtyRequired"));
      return;
    }
    // Only an overage may exceed what was ordered; everything else is bounded by the line.
    const unbounded = rejectType === "overage";
    if (!unbounded && qtyValue > item.qty) {
      toast.error(t("errQtyMax"));
      return;
    }
    const priceValue = parseMoney(price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast.error(t("errPriceRequired"));
      return;
    }
    if (priceValue > item.price_per_unit) {
      toast.error(t("errPriceMax"));
      return;
    }
    if (!note.trim()) {
      toast.error(t("errNetPriceRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const fileIds: number[] = [];
      for (const img of images) {
        if (img.kind === "remote") {
          fileIds.push(img.id);
          continue;
        }
        const remote = await uploadSystemFile(
          locale,
          "purchase_order_item_reject_image",
          img.file
        );
        fileIds.push(remote.id);
      }
      const prefix =
        rejectType === "overage"
          ? overageChoice === "receive"
            ? t("overageNotePrefixReceive")
            : t("overageNotePrefixReturn")
          : "";
      await createReceiveReject(locale, purchaseId, item.id, {
        type: rejectType,
        overage_type: rejectType === "overage" ? overageChoice : null,
        resolution: resolution(),
        qty: qtyValue,
        unit,
        price: priceValue,
        vat_rate: vatRate,
        note: note.trim(),
        note_resolution: prefix || actionLabel(action),
        system_file_ids: fileIds,
      });
      toast.success(tPage("proceed.rejectSuccess"));
      onOpenChange(false);
      onSubmitted();
    } catch (e) {
      toast.error(
        e instanceof OrderReceiveApiError ? e.message : tPage("proceed.rejectFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const { Icon, iconBox } = ACTION_ICON[action];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          step === "form"
            ? "max-h-[min(90dvh,720px)] overflow-y-auto sm:max-w-xl"
            : "sm:max-w-lg"
        }
      >
        <DialogHeader>
          {step === "type" ? (
            <>
              <DialogTitle>{t("typePickerTitle")}</DialogTitle>
              <DialogDescription>{t("typePickerSubtitle")}</DialogDescription>
            </>
          ) : (
            <div className="flex gap-3 pr-2">
              <div className={iconBox} aria-hidden>
                <Icon className="size-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 text-left">
                <DialogTitle className="text-lg leading-snug font-semibold">
                  {actionLabel(action)}
                </DialogTitle>
                <DialogDescription className="text-sm text-foreground/80">
                  {actionDescription(action)}
                </DialogDescription>
              </div>
            </div>
          )}
        </DialogHeader>

        {step === "type" ? (
          <div className="space-y-2">
            {ACTION_LIST.map((a) => {
              const icon = ACTION_ICON[a];
              return (
                <button
                  key={a}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/60"
                  onClick={() => {
                    setAction(a);
                    setRejectType(a === "receive_in" ? "overage" : "damaged");
                    setOverageChoice(a === "return" ? "return" : "receive");
                    setStep("form");
                  }}
                >
                  <div className={icon.iconBox} aria-hidden>
                    <icon.Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{actionLabel(a)}</div>
                    <div className="text-sm text-muted-foreground">
                      {actionDescription(a)}
                    </div>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("hintInstruction")}</p>

            <div className="flex flex-col gap-1.5">
              <Label>{action === "return" ? t("returnReasonLabel") : t("problemLabel")}</Label>
              <Select
                value={rejectType}
                onValueChange={(v) => setRejectType(v as ReceiveRejectType)}
              >
                <SelectTrigger id="reject-type">
                  <SelectValue placeholder={t("returnReasonPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rejectType === "overage" ? (
              <div className="flex flex-col gap-2">
                <Label>{t("problemOverageDesc")}</Label>
                <RadioGroup
                  value={overageChoice}
                  onValueChange={(v) =>
                    setOverageChoice(v as "receive" | "return")
                  }
                  className="flex gap-6"
                >
                  <span className="flex items-center gap-2">
                    <RadioGroupItem value="receive" id="overage-receive" />
                    <Label htmlFor="overage-receive" className="font-normal">
                      {t("overageRadioReceive")}
                    </Label>
                  </span>
                  <span className="flex items-center gap-2">
                    <RadioGroupItem value="return" id="overage-return" />
                    <Label htmlFor="overage-return" className="font-normal">
                      {t("overageRadioReturn")}
                    </Label>
                  </span>
                </RadioGroup>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reject-qty">{t("qtyLabel")}</Label>
                <Input
                  id="reject-qty"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="text-right tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("unitLabel")}</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as PurchaseUnit)}>
                  <SelectTrigger id="reject-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reject-price">{t("priceLabel")}</Label>
                <Input
                  id="reject-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value)}
                  className="text-right tabular-nums"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reject-price-vat">{t("priceVatLabel")}</Label>
                <Input
                  id="reject-price-vat"
                  inputMode="decimal"
                  value={priceVat}
                  onChange={(e) => setPriceVat(e.target.value)}
                  className="text-right tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reject-note">{t("noteLabel")}</Label>
              <Textarea
                id="reject-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <ImageUploadField
                id="reject-images"
                labelKey={t("attachImagesLabel")}
                purpose="purchase_order_item_reject_image"
                value={images}
                onChange={(next) => setImages(next.slice(0, MAX_IMAGES))}
                maxFiles={MAX_IMAGES}
              />
              <p className="text-xs text-muted-foreground">{t("attachImagesHint")}</p>
            </div>
          </div>
        )}

        {step === "form" ? (
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("type")}
              disabled={submitting}
            >
              {t("backToTypePicker")}
            </Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {rejectType === "overage" && overageChoice === "receive"
                ? t("overageConfirmButton")
                : t("intakeConfirmButton")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
