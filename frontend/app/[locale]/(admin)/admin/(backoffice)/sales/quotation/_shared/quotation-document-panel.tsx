"use client";

import {
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  Image as ImageIcon,
  List,
  Save,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import {
  cartLineMaxQty,
  clampCartItemQty,
  type StoreSalesPriceSummary,
} from "@/lib/store-sales-cart-pricing";
import { formatDateTime } from "@/lib/format-datetime";
import type { QuotationLatestReject } from "@/lib/order-quotation-api";
import { fetchSystemFile } from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

import type { StoreSalesDocumentCartLine } from "../../store/_shared/store-sales-document-panel";
import { quotationRejectNoticeClass } from "./quotation-status-styles";

export type QuotationCartLine = StoreSalesDocumentCartLine;

function formatMoney(n: number, locale: string) {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function lineTotal(line: StoreSalesDocumentCartLine) {
  return Math.max(0, line.qty * line.unitPrice - line.discount);
}

function CartQtyInput({
  qty,
  maxQty,
  disabled,
  onQtyChange,
}: {
  qty: number;
  maxQty: number | null;
  disabled: boolean;
  onQtyChange: (qty: number) => void;
}) {
  return (
    <Input
      type="number"
      min={1}
      max={maxQty ?? undefined}
      className="ml-auto w-16 tabular-nums"
      value={String(qty)}
      disabled={disabled}
      onChange={(e) => {
        const parsed = Number.parseInt(e.target.value, 10);
        const next = Number.isFinite(parsed) ? parsed : qty;
        onQtyChange(clampCartItemQty(next, qty, maxQty));
      }}
    />
  );
}

function isWholesaleQty(product: ProductItemBrowseRow | undefined, qty: number) {
  const wh = product?.price_wholesale;
  const min = product?.amount_price_wholesale;
  if (wh == null || min == null || !Number.isFinite(wh) || wh <= 0) return false;
  return qty >= min;
}

function cartLineListPrice(line: StoreSalesDocumentCartLine) {
  return Number(line.product?.price ?? line.unitPrice) || 0;
}

function cartLineEffectiveUnit(line: StoreSalesDocumentCartLine) {
  const q = line.qty;
  const list = cartLineListPrice(line);
  if (q <= 0) return list;
  const net = Math.max(0, q * list - (Number(line.discount) || 0));
  return Math.round((net / q) * 100) / 100;
}

function CartThumbPlaceholder() {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30"
      aria-hidden
    >
      <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
    </div>
  );
}

function CartThumb({ fileId, locale }: { fileId: number; locale: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSystemFile(locale, fileId)
      .then((item) => {
        if (!cancelled) setUrl(item.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, locale]);

  if (loading) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (failed || !url) return <CartThumbPlaceholder />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="size-10 shrink-0 rounded-md border border-border object-cover"
    />
  );
}

function CartUnitPriceCell({
  line,
  locale,
}: {
  line: StoreSalesDocumentCartLine;
  locale: string;
}) {
  const product = line.product;
  const storedUnit = Number(line.unitPrice) || 0;
  const list = cartLineListPrice(line);
  const wholesaleActive = isWholesaleQty(product, line.qty);
  const lineDiscount = Number(line.discount) || 0;
  const effectiveUnit = cartLineEffectiveUnit(line);
  const priceOverride = Math.abs(storedUnit - list) > 0.000_1;
  if (priceOverride) {
    return (
      <div className="text-right tabular-nums">
        {formatMoney(storedUnit, locale)}
      </div>
    );
  }
  const showPromoPrice =
    wholesaleActive ||
    (lineDiscount > 0 && effectiveUnit < list - 0.000_1);

  if (showPromoPrice) {
    const promoUnit = wholesaleActive ? storedUnit : effectiveUnit;
    return (
      <div className="space-y-0.5 text-right">
        <div className="text-muted-foreground tabular-nums line-through">
          {formatMoney(list, locale)}
        </div>
        <div className="text-destructive tabular-nums font-semibold">
          {formatMoney(promoUnit, locale)}
        </div>
      </div>
    );
  }

  return (
    <div className="text-right tabular-nums">
      {formatMoney(storedUnit, locale)}
    </div>
  );
}

type Props = {
  locale: string;
  documentHeading: string;
  issueDate: string;
  validUntil: string;
  reserveStock: boolean;
  notes: string;
  itemLines: StoreSalesDocumentCartLine[];
  cartEmpty: boolean;
  lineCount: number;
  priceSummary: StoreSalesPriceSummary;
  documentCollapsed: boolean;
  onToggleCollapsed: () => void;
  productActionsDisabled: boolean;
  onIssueDateChange: (v: string) => void;
  onValidUntilChange: (v: string) => void;
  onReserveStockChange: (v: boolean) => void;
  onNotesChange: (v: string) => void;
  onItemQtyChange: (key: string, qty: number) => void;
  onItemRemove: (key: string) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmitPending: () => void;
  saving?: boolean;
  isEdit?: boolean;
  layout?: "stacked" | "split";
  latestReject?: QuotationLatestReject | null;
};

export function QuotationDocumentPanel({
  layout = "stacked",
  locale,
  documentHeading,
  issueDate,
  validUntil,
  reserveStock,
  notes,
  itemLines,
  cartEmpty,
  lineCount,
  priceSummary,
  documentCollapsed,
  onToggleCollapsed,
  productActionsDisabled,
  onIssueDateChange,
  onValidUntilChange,
  onReserveStockChange,
  onNotesChange,
  onItemQtyChange,
  onItemRemove,
  onCancel,
  onSaveDraft,
  onSubmitPending,
  saving,
  isEdit,
  latestReject,
}: Props) {
  const tForm = useTranslations("page.orderQuotation.form");
  const tStore = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");
  const tRoot = useTranslations();
  const isSplit = layout === "split";

  const issuePlaceholder = tRoot("form.placeholder.input", {
    label: tForm("issueDate"),
  });
  const validPlaceholder = tRoot("form.placeholder.input", {
    label: tForm("validUntil"),
  });

  return (
    <Card
      className={cn(
        "@container/quotation-doc flex w-full min-w-0 flex-col",
        isSplit &&
          "sticky top-4 z-10 max-h-[calc(100svh-3.5rem-1rem-1.5rem)] w-full min-w-[400px] self-start overflow-hidden"
      )}
    >
      <CardHeader className="shrink-0 space-y-0">
        <div
          className={cn(
            "flex items-start justify-between gap-2",
            documentCollapsed && "items-center"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 gap-3",
              documentCollapsed ? "items-center" : "items-start"
            )}
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400"
              aria-hidden
            >
              <ClipboardList className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-base leading-snug wrap-break-word">
                {documentHeading}
              </CardTitle>
              {!documentCollapsed ? (
                <p className="text-muted-foreground line-clamp-2 text-sm leading-snug wrap-break-word">
                  {tStore("documentSubtitle")}
                </p>
              ) : null}
            </div>
          </div>
          <ButtonIcon
            type="button"
            variant="ghost"
            size="lg"
            className="shrink-0"
            aria-expanded={!documentCollapsed}
            aria-label={
              documentCollapsed ? tStore("expandCard") : tStore("collapseCard")
            }
            onClick={onToggleCollapsed}
          >
            <ChevronDown
              className={cn(
                "text-current transition-transform",
                documentCollapsed && "-rotate-90"
              )}
              aria-hidden
            />
          </ButtonIcon>
        </div>
      </CardHeader>
      {!documentCollapsed ? (
        <>
          <CardContent
            className={cn(
              "flex flex-col gap-3",
              isSplit && "min-h-0 flex-1 overflow-y-auto",
              !isSplit &&
                !cartEmpty &&
                "max-h-[calc(100svh-14rem)] overflow-y-auto"
            )}
          >
            {cartEmpty ? (
              <p className="text-muted-foreground flex min-h-32 items-center justify-center rounded-md border border-dashed p-8 text-center text-sm">
                {tStore("emptyCart")}
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="qt-issue-date">{tForm("issueDate")}</Label>
                    <DatePicker
                      id="qt-issue-date"
                      value={issueDate}
                      onChange={(v) => onIssueDateChange(v ?? "")}
                      placeholder={issuePlaceholder}
                      aria-label={tForm("issueDate")}
                      disabled={productActionsDisabled}
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="qt-valid-until">{tForm("validUntil")}</Label>
                    <DatePicker
                      id="qt-valid-until"
                      value={validUntil}
                      onChange={(v) => onValidUntilChange(v ?? "")}
                      placeholder={validPlaceholder}
                      aria-label={tForm("validUntil")}
                      disabled={productActionsDisabled}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tStore("colProduct")}</TableHead>
                      <TableHead className="text-right">
                        {tStore("quantity")}
                      </TableHead>
                      <TableHead className="text-right">
                        {tStore("pricePerUnit")}
                      </TableHead>
                      <TableHead className="text-right">
                        {tStore("discount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {tStore("lineTotal")}
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemLines.map((line) => {
                      const carSummary =
                        line.product?.car_summary?.trim() ?? "";
                      return (
                        <TableRow key={line.key}>
                          <TableCell className="min-w-[10rem]">
                            <div className="flex items-start gap-3">
                              {line.product?.cover_system_file_id != null ? (
                                <CartThumb
                                  fileId={line.product.cover_system_file_id}
                                  locale={locale}
                                />
                              ) : (
                                <CartThumbPlaceholder />
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="font-medium wrap-break-word">
                                  {line.product?.name ||
                                    line.product?.sku ||
                                    "—"}
                                </div>
                                {line.product?.sku ? (
                                  <div className="text-muted-foreground text-xs">
                                    SKU: {line.product.sku}
                                  </div>
                                ) : null}
                                {line.product?.brand_name ? (
                                  <div className="text-muted-foreground text-xs">
                                    {line.product.brand_name}
                                  </div>
                                ) : null}
                                {carSummary ? (
                                  <span className="bg-primary/10 text-primary mt-1 inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs">
                                    {carSummary}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <CartQtyInput
                              qty={line.qty}
                              maxQty={cartLineMaxQty(line.product)}
                              disabled={productActionsDisabled}
                              onQtyChange={(next) =>
                                onItemQtyChange(line.key, next)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <CartUnitPriceCell line={line} locale={locale} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(line.discount, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(lineTotal(line), locale)}
                          </TableCell>
                          <TableCell className="text-center">
                            <ButtonIcon
                              type="button"
                              variant="outline"
                              size="lg"
                              tone="delete"
                              aria-label={tCrud("btn.delete")}
                              disabled={productActionsDisabled}
                              onClick={() => onItemRemove(line.key)}
                            >
                              <X className="text-current" aria-hidden />
                            </ButtonIcon>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>

                <div className="bg-primary/10 border-primary/20 rounded-md border p-3">
                <div className="text-primary mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <List className="size-4 shrink-0" aria-hidden />
                  {tStore("priceSummary")}
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tStore("itemsTotal", { count: lineCount })}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.itemsTotal, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tStore("discountTotal")}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.discountTotal, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tStore("vatAmount")}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.vatAmount, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tStore("grandTotal")}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.grandTotal, locale)}
                    </span>
                  </div>
                  <div className="border-primary/30 mt-2 flex justify-between gap-2 border-t border-dashed pt-2 font-semibold">
                    <span>{tStore("netTotal")}</span>
                    <span className="text-primary text-base tabular-nums">
                      {formatMoney(priceSummary.netTotal, locale)}
                    </span>
                  </div>
                </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={reserveStock}
                    disabled={productActionsDisabled}
                    onCheckedChange={(c) => onReserveStockChange(c === true)}
                  />
                  {tForm("reserveStock")}
                </label>

                <div className="grid gap-1">
                  <Label htmlFor="qt-notes">{tForm("notes")}</Label>
                  <Textarea
                    id="qt-notes"
                    value={notes}
                    disabled={productActionsDisabled}
                    placeholder={tRoot("form.placeholder.input", {
                      label: tForm("notes"),
                    })}
                    onChange={(e) => onNotesChange(e.target.value)}
                  />
                </div>
              </>
            )}
            {latestReject?.note?.trim() ? (
              <div
                className={quotationRejectNoticeClass(latestReject.next_status)}
                role="status"
              >
                <div className="flex gap-2">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-current"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium leading-snug">
                      {tForm("latestReturnNote")}
                    </p>
                    <p className="whitespace-pre-wrap leading-snug">
                      {latestReject.note.trim()}
                    </p>
                    <p className="text-xs opacity-80">
                      {formatDateTime(latestReject.created_at, locale)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="shrink-0 flex-col gap-3 border-t bg-card">
            <div className="flex w-full flex-col gap-2 @md/quotation-doc:flex-row">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="min-w-0 @md/quotation-doc:flex-1"
                onClick={onCancel}
              >
                {isEdit ? tCrud("btn.cancel") : tCrud("btn.back")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-w-0 @md/quotation-doc:flex-1"
                onClick={onSaveDraft}
                disabled={
                  productActionsDisabled || cartEmpty || saving
                }
              >
                <Save className="text-current" aria-hidden />
                {tStore("saveDraft")}
              </Button>
              <Button
                type="button"
                size="lg"
                className="min-w-0 bg-green-600 hover:bg-green-700 @md/quotation-doc:flex-1"
                onClick={onSubmitPending}
                disabled={
                  productActionsDisabled || cartEmpty || saving
                }
              >
                {tForm("submitPending")}
              </Button>
            </div>
          </CardFooter>
        </>
      ) : null}
    </Card>
  );
}
