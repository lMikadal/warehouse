"use client";

import { CreditCard, Lock, Package, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function WarningBadge() {
  return (
    <div className="bg-warehouse-warning-bg text-warehouse-warning-fg relative flex size-16 items-center justify-center rounded-full">
      <Package className="size-8" aria-hidden />
      <span className="bg-warehouse-warning-fg text-warehouse-warning-bg absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full text-xs font-bold">
        !
      </span>
    </div>
  );
}

/** Asked before a loan goes out while part of the slip is still unpicked. */
export function RemainingStockDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const tPage = useTranslations("page.orderPicking");
  const tCrud = useTranslations("crud");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <WarningBadge />
          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-lg">
              {tPage("remainingStockTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {tPage("remainingStockTitle")}
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="w-full" onClick={onConfirm}>
            {tCrud("btn.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Offered after settling when the family still has goods left to bill. */
export function RemainingExtraBillDialog({
  open,
  onOpenChange,
  onExtraBill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExtraBill: () => void;
}) {
  const tPage = useTranslations("page.orderPicking");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <WarningBadge />
          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-lg">
              {tPage("remainingExtraBillTitle")}
            </DialogTitle>
            <DialogDescription>
              {tPage("remainingExtraBillDescription")}
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="w-full" onClick={onExtraBill}>
            {tPage("submitExtraOrder")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreditExceededDialog({
  open,
  onOpenChange,
  onRequestApproval,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestApproval: () => void;
}) {
  const tPage = useTranslations("page.orderPicking");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <div className="bg-primary/10 text-primary relative flex size-16 items-center justify-center rounded-full">
            <CreditCard className="size-8" aria-hidden />
            <span className="bg-primary text-primary-foreground absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full text-xs font-bold">
              !
            </span>
          </div>
          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-lg">
              {tPage("creditExceededTitle")}
            </DialogTitle>
            <DialogDescription>
              {tPage("creditExceededDescription")}
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="w-full" onClick={onRequestApproval}>
            {tPage("requestApproval")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One dialog for both approver PINs; `kind` only picks the wording, the check is server-side. */
export function ApproverPasswordDialog({
  kind,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  errorMessage,
}: {
  kind: "credit" | "discount";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (code: string) => void | Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}) {
  const tPage = useTranslations("page.orderPicking");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open) setCode("");
  }, [open]);

  const prefix = kind === "credit" ? "creditApprover" : "discountApprover";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <div className="border-primary text-primary flex size-16 items-center justify-center rounded-full border-2">
            <ShieldCheck className="size-8" aria-hidden />
          </div>
          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-lg">{tPage(`${prefix}Title`)}</DialogTitle>
            <DialogDescription>
              {tPage(`${prefix}Description`)}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full space-y-2 text-left">
            <div className="relative">
              <Lock
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                type="password"
                className="pl-8"
                value={code}
                placeholder={tPage(`${prefix}Placeholder`)}
                disabled={isLoading}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.trim()) void onConfirm(code);
                }}
              />
            </div>
            {errorMessage ? (
              <p className="text-destructive text-sm">{errorMessage}</p>
            ) : null}
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={isLoading || !code.trim()}
            onClick={() => void onConfirm(code)}
          >
            {tPage(`${prefix}Confirm`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SpecialDiscountAmountDialog({
  open,
  onOpenChange,
  initialAmount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAmount: number;
  onConfirm: (amount: number) => void;
}) {
  const tPage = useTranslations("page.orderPicking");
  const tCrud = useTranslations("crud");
  const [draft, setDraft] = useState("0");

  useEffect(() => {
    if (!open) return;
    setDraft(String(initialAmount > 0 ? initialAmount : 0));
  }, [open, initialAmount]);

  const submit = () => {
    const n = Number(draft);
    onConfirm(Number.isFinite(n) && n >= 0 ? n : 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-lg">
              {tPage("specialDiscountAmountTitle")}
            </DialogTitle>
            <DialogDescription>
              {tPage("specialDiscountAmountDescription")}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={0}
            step="0.01"
            className="text-right tabular-nums"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button type="button" className="flex-1" onClick={submit}>
              {tPage("specialDiscountAmountConfirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
