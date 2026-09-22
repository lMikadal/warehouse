"use client";

import { ChevronDown, ClipboardCheck, FilePlus2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { TableIconActions } from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DisplayLocale } from "@/lib/format-datetime";
import type {
  StoreClaimDetail,
  StoreClaimPaymentLine,
  StoreClaimPaymentMethod,
  StoreClaimPaymentType,
} from "@/lib/order-store-claim-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import { cn } from "@/lib/utils";

import { PickingProductCell } from "../../order/_shared/picking-panels";
import {
  remainingClaimAmount,
  type StoreClaimDraft,
  type StoreClaimDraftItem,
} from "../_lib/store-claim-draft";

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** The paid lines of the payment; each row is a candidate for the claim being drafted. */
export function StoreClaimItemsCard({
  lines,
  productsById,
  selectedIds,
  canEdit,
  onEdit,
  locale,
}: {
  lines: StoreClaimPaymentLine[];
  productsById: Map<number, ProductItemBrowseRow>;
  selectedIds: Set<number>;
  canEdit: boolean;
  onEdit: (line: StoreClaimPaymentLine) => void;
  locale: DisplayLocale;
}) {
  const tPage = useTranslations("page.orderStoreClaim");

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tPage("colProduct")}</TableHead>
              <TableHead className="w-16 text-center">
                {tPage("quantity")}
              </TableHead>
              <TableHead className="text-right">{tPage("pricePerUnit")}</TableHead>
              <TableHead className="text-right">{tPage("discount")}</TableHead>
              <TableHead className="text-right">{tPage("lineTotal")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8 text-center"
                >
                  {tPage("empty")}
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => {
                const selected = selectedIds.has(line.id);
                const full = remainingClaimAmount(line) <= 0;
                return (
                  <TableRow key={line.id}>
                    <TableCell className="min-w-0">
                      <PickingProductCell
                        product={
                          line.product_item_id
                            ? productsById.get(line.product_item_id)
                            : undefined
                        }
                        detail={line.detail ?? undefined}
                        locale={locale}
                      />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {line.amount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(line.price_per_unit, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(line.discount, locale)}
                    </TableCell>
                    <TableCell className="text-primary text-right font-semibold tabular-nums">
                      {money(line.total_price, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      <TableIconActions
                        actions={["edit"]}
                        disabledActions={
                          !canEdit || selected || full ? ["edit"] : undefined
                        }
                        onAction={() => onEdit(line)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** How the payment was settled, per channel, plus whatever is still owed on it. */
export function StoreClaimPaymentSummaryCard({
  methods,
  paymentTotal,
  locale,
}: {
  methods: StoreClaimPaymentMethod[];
  paymentTotal: number;
  locale: DisplayLocale;
}) {
  const tPage = useTranslations("page.orderStoreClaim");
  const paid = methods.reduce((sum, m) => sum + m.amount, 0);
  const outstanding = Math.max(0, Math.round((paymentTotal - paid) * 100) / 100);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg"
            aria-hidden
          >
            <Wallet className="size-4" />
          </span>
          <h2 className="text-foreground text-sm font-semibold">
            {tPage("paymentSummary")}
          </h2>
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          {methods.length === 0 ? (
            <p className="text-muted-foreground">{tPage("emptyCell")}</p>
          ) : (
            methods.map((m) => (
              <div key={m.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {m.name?.trim() || tPage("emptyCell")}
                </span>
                <span className="tabular-nums">{money(m.amount, locale)}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-dashed pt-2">
          <span className="text-muted-foreground text-sm">
            {tPage("outstanding")}
          </span>
          <span className="text-warehouse-success-fg text-sm font-semibold tabular-nums">
            {money(outstanding, locale)} {tPage("currencyBaht")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** A claim already on file against this payment. Read-only; the workflow moves it from purchasing. */
export function ExistingStoreClaimCard({
  claim,
  productsById,
  collapsed,
  onToggleCollapse,
  locale,
}: {
  claim: StoreClaimDetail;
  productsById: Map<number, ProductItemBrowseRow>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  locale: DisplayLocale;
}) {
  const tPage = useTranslations("page.orderStoreClaim");
  const tList = useTranslations("page.orderStoreClaimList");

  const notes = claim.items.filter((it) => it.note.trim());

  return (
    <Card className="shrink-0">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            className="bg-warehouse-success-bg text-warehouse-success-fg flex size-10 shrink-0 items-center justify-center rounded-full"
            aria-hidden
          >
            <ClipboardCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-base font-semibold">
              {claim.type === "return"
                ? tPage("returnDocTitle")
                : tPage("claimDocTitle")}
              {claim.sku?.trim() ? (
                <span className="text-muted-foreground ml-2 font-medium">
                  {claim.sku}
                </span>
              ) : null}
            </p>
            <p
              className={cn(
                "text-muted-foreground text-sm",
                collapsed && "truncate"
              )}
            >
              {tList(`status.${claim.status}`)}
              {" · "}
              {tPage(`paymentType.${claim.payment_type}`)}
              {" · "}
              {money(claim.total_price, locale)} {tPage("currencyBaht")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="size-8 shrink-0 p-0"
            aria-expanded={!collapsed}
            aria-label={collapsed ? tPage("expandCard") : tPage("collapseCard")}
            onClick={onToggleCollapse}
          >
            <ChevronDown
              className={cn("size-4 transition-transform", collapsed && "-rotate-90")}
              aria-hidden
            />
          </Button>
        </div>

        {collapsed ? null : (
          <div className="flex flex-col gap-3 border-t pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tPage("colProduct")}</TableHead>
                  <TableHead className="w-16 text-center">
                    {tPage("quantity")}
                  </TableHead>
                  <TableHead>{tPage("reasonLabel")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claim.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="min-w-0">
                      <PickingProductCell
                        product={
                          it.product_item_id
                            ? productsById.get(it.product_item_id)
                            : undefined
                        }
                        locale={locale}
                      />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {it.amount}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {it.reason_name?.trim() || tPage("emptyCell")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {notes.length > 0 ? (
              <div className="bg-muted/40 flex flex-col gap-1 rounded-lg p-3 text-sm">
                <p className="text-warehouse-error-fg font-medium">
                  {tPage("customerNote")}
                </p>
                {notes.map((it) => (
                  <p key={it.id} className="text-muted-foreground">
                    {it.note}
                  </p>
                ))}
              </div>
            ) : null}

            {claim.payment_type === "other" && claim.other_reason.trim() ? (
              <div className="flex flex-col gap-1 text-sm">
                <p className="text-muted-foreground text-xs">
                  {tPage("otherReason")}
                </p>
                <p className="text-foreground font-medium">{claim.other_reason}</p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** The document being drafted: picked lines, refund channel and amount, then file it. */
export function StoreClaimDocumentPanel({
  draft,
  paymentCategory,
  canSubmit,
  submitting,
  onChange,
  onRemoveItem,
  onCancel,
  onConfirm,
  locale,
}: {
  draft: StoreClaimDraft;
  paymentCategory: "credit" | "payment";
  canSubmit: boolean;
  submitting: boolean;
  onChange: (patch: Partial<StoreClaimDraft>) => void;
  onRemoveItem: (paymentItemId: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
  locale: DisplayLocale;
}) {
  const tPage = useTranslations("page.orderStoreClaim");
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");

  const empty = draft.items.length === 0;
  // A loan bill was never paid in cash, so its refund can only come off the debt.
  const lockDebtReduction = paymentCategory === "credit";
  const title = empty
    ? tPage("createDocument")
    : draft.type === "return"
      ? tPage("returnDocTitle")
      : tPage("claimDocTitle");

  useEffect(() => {
    if (!lockDebtReduction || empty) return;
    if (draft.paymentType === "debt_reduction") return;
    onChange({ paymentType: "debt_reduction" });
    // ponytail: onChange is an inline setState; only the lock inputs drive this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockDebtReduction, empty, draft.paymentType]);

  const paymentOptions: StoreClaimPaymentType[] = lockDebtReduction
    ? ["cash", "transfer", "other", "debt_reduction"]
    : ["cash", "transfer", "other"];

  const notes = draft.items.filter((it) => it.note.trim());

  return (
    <Card className="shrink-0">
      <CardContent className="flex flex-col gap-4">
        <div className="flex shrink-0 items-start gap-3 border-b pb-4">
          <span
            className="bg-warehouse-success-bg text-warehouse-success-fg flex size-10 shrink-0 items-center justify-center rounded-full"
            aria-hidden
          >
            <ClipboardCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-foreground text-lg font-semibold">{title}</h2>
            <p className="text-muted-foreground text-xs">
              {tPage("createDocumentHint")}
            </p>
          </div>
        </div>

        {empty ? (
          <div className="bg-background flex min-h-70 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center">
            <span className="text-muted-foreground/50" aria-hidden>
              <FilePlus2 className="size-16" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-foreground font-semibold">{tPage("emptyTitle")}</p>
              <p className="text-muted-foreground text-sm">{tPage("emptyHint")}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tPage("colProduct")}</TableHead>
                  <TableHead className="w-16 text-center">
                    {tPage("quantity")}
                  </TableHead>
                  <TableHead>{tPage("reasonLabel")}</TableHead>
                  <TableHead className="w-12 text-center">
                    {tCrud("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.items.map((it: StoreClaimDraftItem) => (
                  <TableRow key={it.paymentItemId}>
                    <TableCell className="min-w-0">
                      <PickingProductCell
                        product={it.product}
                        detail={it.detail || undefined}
                        locale={locale}
                      />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {it.amount}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {it.reasonName || tPage("emptyCell")}
                    </TableCell>
                    <TableCell className="text-center">
                      <TableIconActions
                        actions={["delete"]}
                        onAction={() => onRemoveItem(it.paymentItemId)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {notes.length > 0 ? (
              <div className="bg-muted/40 flex flex-col gap-1 rounded-lg p-3 text-sm">
                <p className="text-warehouse-error-fg font-medium">
                  {tPage("customerNote")}
                </p>
                {notes.map((it) => (
                  <p key={it.paymentItemId} className="text-muted-foreground">
                    {it.note}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="store-claim-refund-method">
                  {tPage("refundMethod")}
                </Label>
                <Select
                  value={draft.paymentType || undefined}
                  onValueChange={(v) =>
                    onChange({ paymentType: v as StoreClaimPaymentType })
                  }
                  disabled={lockDebtReduction}
                >
                  <SelectTrigger id="store-claim-refund-method">
                    <SelectValue
                      placeholder={tForm("placeholder.select", {
                        label: tPage("refundMethod"),
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((value) => (
                      <SelectItem key={value} value={value}>
                        {tPage(`paymentType.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {draft.paymentType === "other" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="store-claim-other-reason">
                    {tPage("otherReason")}
                  </Label>
                  <Input
                    id="store-claim-other-reason"
                    value={draft.otherReason}
                    onChange={(e) => onChange({ otherReason: e.target.value })}
                    placeholder={tForm("placeholder.input", {
                      label: tPage("otherReason"),
                    })}
                  />
                </div>
              ) : null}

              <div className="grid gap-1.5">
                <Label htmlFor="store-claim-refund-amount">
                  {tPage("refundAmount")}
                </Label>
                <Input
                  id="store-claim-refund-amount"
                  inputMode="decimal"
                  value={draft.totalPrice}
                  onChange={(e) => onChange({ totalPrice: e.target.value })}
                  placeholder={tForm("placeholder.input", {
                    label: tPage("refundAmount"),
                  })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={onCancel}
              >
                {tCrud("btn.cancel")}
              </Button>
              <Button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={onConfirm}
              >
                {tPage("confirm")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
