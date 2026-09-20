"use client";

import { Image as ImageIcon, List } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
  type StoreSalesPriceSummary,
} from "@/lib/store-sales-cart-pricing";
import { fetchSystemFile } from "@/lib/system-file-api";

import type { StoreSalesDocumentCartLine } from "../../store/_shared/store-sales-document-panel";

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
  onQtyChange,
}: {
  qty: number;
  maxQty: number | null;
  onQtyChange: (qty: number) => void;
}) {
  return (
    <Input
      type="number"
      min={1}
      max={maxQty ?? undefined}
      className="ml-auto w-16 tabular-nums"
      value={String(qty)}
      onChange={(e) => {
        const parsed = Number.parseInt(e.target.value, 10);
        const next = Number.isFinite(parsed) ? parsed : qty;
        onQtyChange(clampCartItemQty(next, qty, maxQty));
      }}
    />
  );
}

function parseMoneyInput(raw: string, fallback: number) {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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
  itemLines: StoreSalesDocumentCartLine[];
  lineCount: number;
  priceSummary: StoreSalesPriceSummary;
  editable?: boolean;
  onLineChange?: (
    key: string,
    patch: Partial<Pick<StoreSalesDocumentCartLine, "qty" | "unitPrice" | "discount">>
  ) => void;
};

export function QuotationDetailItemsPanel({
  locale,
  itemLines,
  lineCount,
  priceSummary,
  editable = false,
  onLineChange,
}: Props) {
  const tStore = useTranslations("page.orderStore.form");

  return (
    <Card className="flex min-h-0 flex-col md:h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base">{tStore("tabProducts")}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tStore("colProduct")}</TableHead>
                <TableHead className="text-right">{tStore("quantity")}</TableHead>
                <TableHead className="text-right">
                  {tStore("pricePerUnit")}
                </TableHead>
                <TableHead className="text-right">{tStore("discount")}</TableHead>
                <TableHead className="text-right">{tStore("lineTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemLines.map((line) => {
                const carSummary = line.product?.car_summary?.trim() ?? "";
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
                            {line.product?.name || line.product?.sku || "—"}
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
                      {editable && onLineChange ? (
                        <CartQtyInput
                          qty={line.qty}
                          maxQty={cartLineMaxQty(line.product)}
                          onQtyChange={(next) =>
                            onLineChange(line.key, { qty: next })
                          }
                        />
                      ) : (
                        <span className="tabular-nums">{line.qty}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editable && onLineChange ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="ml-auto w-24 tabular-nums"
                          value={String(line.unitPrice)}
                          onChange={(e) =>
                            onLineChange(line.key, {
                              unitPrice: parseMoneyInput(
                                e.target.value,
                                line.unitPrice
                              ),
                            })
                          }
                        />
                      ) : (
                        <CartUnitPriceCell line={line} locale={locale} />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editable && onLineChange ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="ml-auto w-24 tabular-nums"
                          value={String(line.discount)}
                          onChange={(e) =>
                            onLineChange(line.key, {
                              discount: parseMoneyInput(
                                e.target.value,
                                line.discount
                              ),
                            })
                          }
                        />
                      ) : (
                        <span className="tabular-nums">
                          {formatMoney(line.discount, locale)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(lineTotal(line), locale)}
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
              <span className="text-muted-foreground">{tStore("vatAmount")}</span>
              <span className="tabular-nums">
                {formatMoney(priceSummary.vatAmount, locale)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">{tStore("grandTotal")}</span>
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
      </CardContent>
    </Card>
  );
}
