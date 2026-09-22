"use client";

import { ClipboardCheck, ShoppingBag, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPurchase,
  OrderPurchaseApiError,
  type PurchaseItemInput,
} from "@/lib/order-purchase-api";
import { cn } from "@/lib/utils";

import {
  computePurchaseDraftTotals,
  roundMoney,
} from "../_lib/purchase-totals";
import { PurchaseMoneySummary } from "./purchase-money-summary";
import type { ReceiveDraftCard } from "./purchase-ticket-receive-types";

const DEFAULT_VAT_RATE = 7;

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type PurchaseTicketReceiveSummaryPanelProps = {
  cards: ReceiveDraftCard[];
  setCards: Dispatch<SetStateAction<ReceiveDraftCard[]>>;
  ticketId: number;
  suppressEmptyPlaceholder?: boolean;
  onSaveSuccess: (savedTicketItemIds: number[]) => void;
};

export function PurchaseTicketReceiveSummaryPanel({
  cards,
  setCards,
  ticketId,
  suppressEmptyPlaceholder = false,
  onSaveSuccess,
}: PurchaseTicketReceiveSummaryPanelProps) {
  const locale = useLocale();
  const t = useTranslations("page.orderPurchase.receive");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const tUnit = useTranslations("page.orderPurchase.unit");

  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (cards.length === 0) {
    if (suppressEmptyPlaceholder) return null;
    return (
      <Card className="flex min-h-72 flex-1 items-center justify-center shadow-none">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <ClipboardCheck className="size-7" aria-hidden />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("draftPoEmptyState")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const patchCard = (key: string, patch: Partial<ReceiveDraftCard>) => {
    setCards((prev) =>
      prev.map((card) => (card.key === key ? { ...card, ...patch } : card))
    );
  };

  const patchLine = (
    cardKey: string,
    ticketItemId: number,
    patch: {
      qtyOrder?: number;
      pricePerUnit?: number;
      discount?: number;
    }
  ) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.key !== cardKey) return card;
        return {
          ...card,
          lines: card.lines.map((line) => {
            if (line.ticketItemId !== ticketItemId) return line;
            return {
              ...line,
              qtyOrder:
                patch.qtyOrder !== undefined
                  ? Math.max(1, patch.qtyOrder)
                  : line.qtyOrder,
              pricing: {
                pricePerUnit:
                  patch.pricePerUnit !== undefined
                    ? Math.max(0, patch.pricePerUnit)
                    : line.pricing.pricePerUnit,
                discount:
                  patch.discount !== undefined
                    ? Math.max(0, patch.discount)
                    : line.pricing.discount,
              },
            };
          }),
        };
      })
    );
  };

  const removeCard = (key: string) => {
    setCards((prev) => prev.filter((card) => card.key !== key));
  };

  const removeLine = (cardKey: string, ticketItemId: number) => {
    setCards((prev) =>
      prev
        .map((card) =>
          card.key !== cardKey
            ? card
            : {
                ...card,
                lines: card.lines.filter(
                  (line) => line.ticketItemId !== ticketItemId
                ),
              }
        )
        .filter((card) => card.lines.length > 0)
    );
  };

  const submitCard = async (
    card: ReceiveDraftCard,
    status: "draft" | "pending"
  ) => {
    if (card.lines.length === 0) {
      toast.error(t("summaryNothingToSubmit"));
      return;
    }
    if (card.lines.some((line) => line.qtyOrder < 1)) {
      toast.error(tError("required"));
      return;
    }
    setSubmittingKey(card.key);
    try {
      const items: PurchaseItemInput[] = card.lines.map((line) => ({
        purchase_request_item_id: line.ticketItemId,
        type: line.type,
        product_item_id: line.productItemId,
        name: line.type === "custom" ? line.name : null,
        product_attribute_brand_id: line.brandId,
        product_attribute_model_id: line.modelId,
        product_attribute_engine_id: line.engineId,
        identification_number: line.identificationNumber,
        qty: line.qtyOrder,
        free_gift: 0,
        unit: line.unit,
        price_per_unit: line.pricing.pricePerUnit,
        vat_rate: DEFAULT_VAT_RATE,
        discount: line.pricing.discount,
        note: line.note,
      }));
      await createPurchase(locale, {
        status,
        supplier_user_id: Number(card.supplierId),
        purchase_request_id: ticketId,
        vat_type: "exclude",
        vat_rate: DEFAULT_VAT_RATE,
        discount: card.discount,
        special_discount: 0,
        is_waiting: status === "draft",
        note: card.note,
        items,
      });
      toast.success(tCrud("toast.saved"));
      const ids = card.lines.map((l) => l.ticketItemId);
      setCards((prev) => prev.filter((c) => c.key !== card.key));
      onSaveSuccess(ids);
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmittingKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {cards.map((card) => {
        const isOpen = expanded[card.key] ?? true;
        const totals = computePurchaseDraftTotals(
          card.lines.map((line) => ({
            qty: line.qtyOrder,
            price_per_unit: line.pricing.pricePerUnit,
            discount: line.pricing.discount,
          })),
          {
            discount: card.discount,
            specialDiscount: 0,
            vatRate: DEFAULT_VAT_RATE,
          }
        );
        const busy = submittingKey === card.key;
        return (
          <Card key={card.key} className="shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 py-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [card.key]: !isOpen,
                  }))
                }
              >
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingBag className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{card.supplierLabel}</span>
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("summaryLineCountShort", { count: card.lines.length })}
                  {" · "}
                  {t("summaryCollapsedNetBaht", {
                    amount: money(totals.total_grand_price, locale),
                  })}
                </p>
              </button>
              <ButtonIcon
                type="button"
                tone="delete"
                aria-label={t("summaryRemoveSupplier")}
                disabled={busy}
                onClick={() => removeCard(card.key)}
              >
                <Trash2 className="size-4" />
              </ButtonIcon>
            </CardHeader>
            {isOpen ? (
              <CardContent className="space-y-3 px-4 pb-4">
                {card.lines.map((line) => (
                  <div
                    key={line.ticketItemId}
                    className="space-y-2 rounded-md border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {line.name}
                        </p>
                        {line.sku ? (
                          <p className="text-xs text-muted-foreground">
                            {line.sku}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        onClick={() => removeLine(card.key, line.ticketItemId)}
                        aria-label={tCrud("btn.delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t("colQtyReorder")}</Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8"
                          value={line.qtyOrder}
                          disabled={busy}
                          onChange={(e) =>
                            patchLine(card.key, line.ticketItemId, {
                              qtyOrder: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t("summaryPricePerUnit")}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8"
                          value={line.pricing.pricePerUnit}
                          disabled={busy}
                          onChange={(e) =>
                            patchLine(card.key, line.ticketItemId, {
                              pricePerUnit: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t("summaryLineDiscount")}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8"
                          value={line.pricing.discount}
                          disabled={busy}
                          onChange={(e) =>
                            patchLine(card.key, line.ticketItemId, {
                              discount: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("colUnit")}: {tUnit(line.unit)} · {t("colQtySell")}:{" "}
                      {line.qtySell}
                    </p>
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor={`receive-card-discount-${card.key}`}>
                    {t("summaryLineDiscount")}
                  </Label>
                  <Input
                    id={`receive-card-discount-${card.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={card.discount}
                    disabled={busy}
                    onChange={(e) =>
                      patchCard(card.key, {
                        discount: roundMoney(Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`receive-card-note-${card.key}`}>
                    {t("summaryNoteLabel")}
                  </Label>
                  <Textarea
                    id={`receive-card-note-${card.key}`}
                    value={card.note}
                    disabled={busy}
                    placeholder={t("summaryNotePlaceholder")}
                    rows={2}
                    onChange={(e) =>
                      patchCard(card.key, { note: e.target.value })
                    }
                  />
                </div>

                <PurchaseMoneySummary
                  totals={totals}
                  vatPercent={DEFAULT_VAT_RATE}
                  className={cn("pt-2")}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void submitCard(card, "draft")}
                  >
                    {t("summaryCreateDraft")}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void submitCard(card, "pending")}
                  >
                    {t("summaryCreatePending")}
                  </Button>
                </div>
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
