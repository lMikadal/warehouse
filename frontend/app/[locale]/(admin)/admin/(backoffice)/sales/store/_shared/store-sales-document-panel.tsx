"use client";

import {
  ChevronDown,
  ClipboardList,
  Image as ImageIcon,
  List,
  Printer,
  Save,
  SquarePen,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import {
  cartLineMaxQty,
  clampCartItemQty,
  normalizeCompareLineDetail,
  type StoreSalesPriceSummary,
} from "@/lib/store-sales-cart-pricing";
import { fetchSystemFile } from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

export type StoreSalesDocumentCartLine = {
  key: string;
  product?: ProductItemBrowseRow;
  type: "item" | "compare";
  qty: number;
  unitPrice: number;
  discount: number;
  detail?: string;
};

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
  const apply = (next: number) => {
    onQtyChange(clampCartItemQty(next, qty, maxQty));
  };

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
        apply(Number.isFinite(parsed) ? parsed : qty);
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
  const list = cartLineListPrice(line);
  const wholesaleActive = isWholesaleQty(product, line.qty);
  const lineDiscount = Number(line.discount) || 0;
  const effectiveUnit = cartLineEffectiveUnit(line);
  const showPromoPrice =
    wholesaleActive || (lineDiscount > 0 && effectiveUnit < list - 0.000_1);

  if (showPromoPrice) {
    const promoUnit = wholesaleActive ? line.unitPrice : effectiveUnit;
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
    <div className="text-right tabular-nums">{formatMoney(list, locale)}</div>
  );
}

type Props = {
  locale: string;
  sku?: string;
  orderDateDisplay: string;
  receiveAtDisplay: string;
  receiveTypeLabel: string;
  cartTab: "items" | "compare";
  onCartTabChange: (tab: "items" | "compare") => void;
  itemLines: StoreSalesDocumentCartLine[];
  compareLines: StoreSalesDocumentCartLine[];
  cartEmpty: boolean;
  lineCount: number;
  priceSummary: StoreSalesPriceSummary;
  documentCollapsed: boolean;
  onToggleCollapsed: () => void;
  productActionsDisabled: boolean;
  orderId?: number;
  perms: { create?: boolean; update?: boolean };
  onShippingEdit: () => void;
  onItemQtyChange: (key: string, qty: number) => void;
  onItemRemove: (key: string) => void;
  onCompareQtyChange: (key: string, qty: number) => void;
  onCompareEdit: (key: string) => void;
  onCompareRemove: (key: string) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmitPending: () => void;
  onPrintSlip: () => void;
  /** Secondary print row — hidden while order is still draft. */
  showPrintSlip?: boolean;
  layout?: "stacked" | "split";
};

export function StoreSalesDocumentPanel({
  layout = "stacked",
  locale,
  sku,
  orderDateDisplay,
  receiveAtDisplay,
  receiveTypeLabel,
  cartTab,
  onCartTabChange,
  itemLines,
  compareLines,
  cartEmpty,
  lineCount,
  priceSummary,
  documentCollapsed,
  onToggleCollapsed,
  productActionsDisabled,
  orderId,
  perms,
  onShippingEdit,
  onItemQtyChange,
  onItemRemove,
  onCompareQtyChange,
  onCompareEdit,
  onCompareRemove,
  onCancel,
  onSaveDraft,
  onSubmitPending,
  onPrintSlip,
  showPrintSlip = false,
}: Props) {
  const tForm = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");
  const isSplit = layout === "split";

  return (
    <Card
      className={cn(
        "@container/store-sales-doc flex w-full min-w-0 flex-col",
        isSplit
          ? "sticky top-4 z-10 max-h-[calc(100svh-3.5rem-1rem-1.5rem)] w-full min-w-[400px] self-start overflow-hidden"
          : "shrink-0",
      )}
    >
      <CardHeader className="shrink-0 space-y-0">
        <div
          className={cn(
            "flex items-start justify-between gap-2",
            documentCollapsed && "items-center",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 gap-3",
              documentCollapsed ? "items-center" : "items-start",
            )}
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400"
              aria-hidden
            >
              <ClipboardList className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-base leading-snug">
                {tForm("documentTitle")}
              </CardTitle>
              {!documentCollapsed ? (
                <p className="text-muted-foreground line-clamp-2 text-sm leading-snug wrap-break-word">
                  {tForm("documentSubtitle")}
                </p>
              ) : null}
              {sku ? (
                <p className="truncate font-medium">{sku}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {!cartEmpty ? (
              <div className="text-right text-sm">
                <p className="font-semibold">{tForm("orderDate")}</p>
                <p className="text-muted-foreground tabular-nums">
                  {orderDateDisplay}
                </p>
              </div>
            ) : null}
            <ButtonIcon
              type="button"
              variant="ghost"
              size="lg"
              className="shrink-0"
              aria-expanded={!documentCollapsed}
              aria-label={
                documentCollapsed ? tForm("expandCard") : tForm("collapseCard")
              }
              onClick={onToggleCollapsed}
            >
              <ChevronDown
                className={cn(
                  "text-current transition-transform",
                  documentCollapsed && "-rotate-90",
                )}
                aria-hidden
              />
            </ButtonIcon>
          </div>
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
                "max-h-[calc(100svh-14rem)] overflow-y-auto",
            )}
          >
            {!cartEmpty ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="shrink-0 font-semibold">
                  {tForm("receiveLabel")}
                </span>
                <span className="text-primary min-w-0 flex-1 font-medium">
                  {receiveTypeLabel}{" "}
                  <span className="tabular-nums">{receiveAtDisplay}</span>
                </span>
                <ButtonIcon
                  type="button"
                  variant="outline"
                  size="lg"
                  tone="edit"
                  className="shrink-0"
                  aria-label={tCrud("btn.edit")}
                  onClick={onShippingEdit}
                  disabled={productActionsDisabled}
                >
                  <SquarePen className="text-current" aria-hidden />
                </ButtonIcon>
              </div>
            ) : null}
            {cartEmpty ? (
              <p className="text-muted-foreground flex min-h-32 items-center justify-center rounded-md border border-dashed p-8 text-center text-sm">
                {tForm("emptyCart")}
              </p>
            ) : (
              <Tabs
                value={cartTab}
                onValueChange={(v) =>
                  onCartTabChange(v as "items" | "compare")
                }
              >
                <TabsList
                  variant="line"
                  className="h-auto w-full justify-start gap-5 p-0"
                >
                  <TabsTrigger
                    value="items"
                    className="text-muted-foreground flex-none px-0 data-active:text-primary"
                  >
                    {tForm("tabCartItems")} ({itemLines.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="compare"
                    className="text-muted-foreground flex-none px-0 data-active:text-primary"
                  >
                    {tForm("tabCartCompare")} ({compareLines.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="items" className="mt-3">
                  {itemLines.length === 0 ? (
                    <p className="text-muted-foreground flex min-h-24 w-full items-center justify-center py-6 text-center text-sm">
                      {tForm("emptyCart")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tForm("colProduct")}</TableHead>
                            <TableHead className="text-right">
                              {tForm("quantity")}
                            </TableHead>
                            <TableHead className="text-right">
                              {tForm("pricePerUnit")}
                            </TableHead>
                            <TableHead className="text-right">
                              {tForm("discount")}
                            </TableHead>
                            <TableHead className="text-right">
                              {tForm("lineTotal")}
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
                                    {line.product?.cover_system_file_id !=
                                    null ? (
                                      <CartThumb
                                        fileId={
                                          line.product.cover_system_file_id
                                        }
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
                                  <CartUnitPriceCell
                                    line={line}
                                    locale={locale}
                                  />
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
                  )}
                </TabsContent>
                <TabsContent value="compare" className="mt-3">
                  {compareLines.length === 0 ? (
                    <p className="text-muted-foreground flex min-h-24 w-full items-center justify-center py-6 text-center text-sm">
                      {tForm("emptyCart")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tForm("colProduct")}</TableHead>
                            <TableHead className="text-right">
                              {tForm("quantity")}
                            </TableHead>
                            <TableHead className="w-24" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compareLines.map((line) => (
                            <TableRow key={line.key}>
                              <TableCell className="whitespace-pre-wrap text-sm">
                                {normalizeCompareLineDetail(line.detail) || "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <CartQtyInput
                                  qty={line.qty}
                                  maxQty={null}
                                  disabled={productActionsDisabled}
                                  onQtyChange={(next) =>
                                    onCompareQtyChange(line.key, next)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center gap-1">
                                  <ButtonIcon
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    tone="edit"
                                    aria-label={tCrud("btn.edit")}
                                    disabled={productActionsDisabled}
                                    onClick={() => onCompareEdit(line.key)}
                                  >
                                    <SquarePen
                                      className="text-current"
                                      aria-hidden
                                    />
                                  </ButtonIcon>
                                  <ButtonIcon
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    tone="delete"
                                    aria-label={tCrud("btn.delete")}
                                    disabled={productActionsDisabled}
                                    onClick={() => onCompareRemove(line.key)}
                                  >
                                    <X
                                      className="text-current"
                                      aria-hidden
                                    />
                                  </ButtonIcon>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
            {!cartEmpty ? (
              <div className="bg-primary/10 border-primary/20 rounded-md border p-3">
                <div className="text-primary mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <List className="size-4 shrink-0" aria-hidden />
                  {tForm("priceSummary")}
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tForm("itemsTotal", { count: lineCount })}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.itemsTotal, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tForm("discountTotal")}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.discountTotal, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tForm("shipping")}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.shipping, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tForm("vatAmount")}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.vatAmount, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {tForm("grandTotal")}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(priceSummary.grandTotal, locale)}
                    </span>
                  </div>
                  <div className="border-primary/30 mt-2 flex justify-between gap-2 border-t border-dashed pt-2 font-semibold">
                    <span>{tForm("netTotal")}</span>
                    <span className="text-primary text-base tabular-nums">
                      {formatMoney(priceSummary.netTotal, locale)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="shrink-0 flex-col gap-3 border-t bg-card">
            <div className="grid w-full grid-cols-1 gap-2 @md/store-sales-doc:grid-cols-3">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={onCancel}
              >
                {tCrud("btn.cancel")}
              </Button>
              {perms.create || perms.update ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onSaveDraft}
                  disabled={productActionsDisabled || cartEmpty}
                >
                  <Save className="text-current" aria-hidden />
                  {tForm("saveDraft")}
                </Button>
              ) : null}
              {perms.create || perms.update ? (
                <Button
                  type="button"
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={onSubmitPending}
                  disabled={productActionsDisabled || cartEmpty}
                >
                  {tForm("submitPending")}
                </Button>
              ) : null}
              {showPrintSlip ? (
                <Button
                  type="button"
                  size="lg"
                  className="@md/store-sales-doc:col-span-3"
                  variant="secondary"
                  onClick={onPrintSlip}
                >
                  <Printer className="text-current" aria-hidden />
                  {tForm("printPicking")}
                </Button>
              ) : null}
            </div>
          </CardFooter>
        </>
      ) : null}
    </Card>
  );
}
