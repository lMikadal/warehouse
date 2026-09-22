"use client";

import { ChevronRight, Package, RefreshCw, ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StoreClaimType } from "@/lib/order-store-claim-api";
import { fetchSettingLangList } from "@/lib/setting-api";
import { cn } from "@/lib/utils";

import { clampStoreClaimQty } from "../_lib/store-claim-draft";

export function StoreClaimTopicDialog({
  open,
  onOpenChange,
  lineKey,
  maxQty,
  allowedTopics,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Payment line the dialog is filing against; resets the form when it changes. */
  lineKey: number | null;
  maxQty: number;
  allowedTopics: StoreClaimType[];
  onConfirm: (input: {
    type: StoreClaimType;
    reasonId: number;
    reasonName: string;
    amount: number;
  }) => void;
}) {
  const locale = useLocale();
  const tPage = useTranslations("page.orderStoreClaim");
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");

  const [topic, setTopic] = useState<StoreClaimType | null>(null);
  const [reasonId, setReasonId] = useState("");
  const [reasonLabel, setReasonLabel] = useState("");
  const [qtyInput, setQtyInput] = useState("1");
  const labelsRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!open) return;
    setTopic(allowedTopics[0] ?? null);
    setReasonId("");
    setReasonLabel("");
    setQtyInput("1");
  }, [open, allowedTopics, lineKey]);

  const qty = clampStoreClaimQty(qtyInput, maxQty);
  const canSubmit =
    topic != null &&
    allowedTopics.includes(topic) &&
    reasonId !== "" &&
    qty >= 1 &&
    qty <= maxQty;

  const handleConfirm = () => {
    if (!canSubmit || topic == null) return;
    onConfirm({
      type: topic,
      reasonId: Number(reasonId),
      reasonName: reasonLabel,
      amount: qty,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tPage("topicDialogTitle")}</DialogTitle>
          <DialogDescription>{tPage("topicDialogSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {(["return", "claim"] as const).map((key) => {
            const allowed = allowedTopics.includes(key);
            const expanded = topic === key;
            return (
              <div
                key={key}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  expanded ? "border-primary bg-primary/5" : "border-border",
                  !allowed && "opacity-50"
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 text-left"
                  disabled={!allowed}
                  onClick={() => {
                    if (!allowed) return;
                    setTopic(key);
                    setReasonId("");
                    setReasonLabel("");
                  }}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      key === "return"
                        ? "bg-primary/10 text-primary"
                        : "bg-warehouse-warning-bg text-warehouse-warning-fg"
                    )}
                    aria-hidden
                  >
                    {key === "return" ? (
                      <RefreshCw className="size-5" />
                    ) : (
                      <ShoppingCart className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block font-semibold">
                      {key === "return" ? tPage("topicReturn") : tPage("topicClaim")}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {key === "return"
                        ? tPage("topicReturnHint")
                        : tPage("topicClaimHint")}
                    </span>
                  </span>
                  {expanded ? null : (
                    <ChevronRight
                      className="text-muted-foreground size-4"
                      aria-hidden
                    />
                  )}
                </button>

                {expanded ? (
                  <div className="mt-3 flex flex-col gap-3 border-t pt-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="store-claim-reason">
                        {tPage("reasonLabel")}
                      </Label>
                      <RemoteComboboxField
                        id="store-claim-reason"
                        label={tPage("reasonLabel")}
                        value={reasonId}
                        onValueChange={(v) => {
                          setReasonId(v);
                          setReasonLabel(labelsRef.current.get(v) ?? "");
                        }}
                        placeholder={tPage("reasonPlaceholder")}
                        emptyLabel={tForm("combobox.noResults")}
                        inputClassName="w-full min-w-min"
                        disabled={!allowed}
                        catalogKey={key}
                        onLoadOptions={async ({ search }) => {
                          const res = await fetchSettingLangList(
                            locale,
                            "claim-reasons",
                            {
                              page: 1,
                              limit: 100,
                              search,
                              isActive: true,
                              ...(key === "claim"
                                ? { isClaim: true }
                                : { isReturn: true }),
                            }
                          );
                          const options = res.items.map((it) => ({
                            value: String(it.id),
                            label: it.name,
                          }));
                          for (const o of options) {
                            labelsRef.current.set(o.value, o.label);
                          }
                          return options;
                        }}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="store-claim-qty">{tPage("quantity")}</Label>
                      <Input
                        id="store-claim-qty"
                        inputMode="numeric"
                        value={qtyInput}
                        onChange={(e) => setQtyInput(e.target.value)}
                        placeholder={tPage("qtyPlaceholder")}
                        disabled={!allowed}
                      />
                    </div>
                    {maxQty > 0 ? (
                      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Package className="size-3.5" aria-hidden />
                        {tPage("maxQtyHint", { max: maxQty })}
                      </p>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                      >
                        {tCrud("btn.cancel")}
                      </Button>
                      <Button
                        type="button"
                        disabled={!canSubmit}
                        onClick={handleConfirm}
                      >
                        {tPage("confirm")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
