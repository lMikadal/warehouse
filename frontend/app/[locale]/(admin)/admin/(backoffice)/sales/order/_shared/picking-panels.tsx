"use client";

import {
  AlertTriangle,
  Barcode,
  Building2,
  Calendar,
  Check,
  CircleHelp,
  EyeOff,
  Image as ImageIcon,
  List,
  Plus,
  ShoppingBag,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, type DisplayLocale } from "@/lib/format-datetime";
import type {
  PickingItemDetail,
  PickingItemStatus,
  PickingOrderDetail,
} from "@/lib/order-picking-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import {
  computeStoreSalesPriceSummary,
  type StoreSalesPriceSummary,
} from "@/lib/store-sales-cart-pricing";
import { fetchSystemFile } from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

import {
  isMappedLine,
  lineTotal,
  nextStoreCheckStatus,
  remainingQty,
  sortPickingItems,
  summaryLinesFromOrderLines,
  type PickingOrderLine,
} from "../_lib/picking-lines";
import { pickingItemStatusPillClass } from "./picking-status-styles";

const PANEL_PAGE_SIZE = 10;

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Mirrors the store sales cart thumb: the browse row only carries the cover file id. */
export function ProductThumb({
  fileId,
  locale,
}: {
  fileId: number | null | undefined;
  locale: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(fileId != null);

  useEffect(() => {
    if (fileId == null) return;
    let cancelled = false;
    void fetchSystemFile(locale, fileId)
      .then((item) => {
        if (!cancelled) setUrl(item.url);
      })
      .catch(() => undefined)
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
  if (!url) {
    return (
      <div
        className="border-border bg-muted/30 flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed"
        aria-hidden
      >
        <ImageIcon className="text-muted-foreground size-5" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="border-border size-10 shrink-0 rounded-md border object-cover"
    />
  );
}

export function PickingProductCell({
  product,
  detail,
  locale,
}: {
  product?: ProductItemBrowseRow;
  detail?: string;
  locale: string;
}) {
  const tPage = useTranslations("page.orderPicking");
  const tList = useTranslations("productList");

  if (!product) {
    return (
      <p className="text-foreground whitespace-pre-wrap font-medium">
        {detail?.trim() || tPage("emptyCell")}
      </p>
    );
  }

  const stock = product.available_stock ?? product.total_stock ?? 0;
  const low =
    product.low_stock || stock < (product.minimum_stock ?? 0);
  const carSummary = product.car_summary?.trim() ?? "";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumb fileId={product.cover_system_file_id} locale={locale} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap gap-1">
          {product.is_new ? (
            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs">
              {tList("badgeNew")}
            </span>
          ) : null}
          {low ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
              <AlertTriangle className="size-3" aria-hidden />
              {tList("lowStock")}
            </span>
          ) : null}
          {product.is_stopped ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
              <EyeOff className="size-3" aria-hidden />
              {tList("salesStopped")}
            </span>
          ) : null}
        </div>
        <div className="font-medium">{product.name}</div>
        <div className="text-muted-foreground text-sm">SKU: {product.sku}</div>
        {product.car_count > 0 && carSummary ? (
          <span className="border-primary/20 bg-primary/5 text-primary mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.625rem] leading-snug">
            <span className="truncate">{carSummary}</span>
            {product.car_count > 1 ? (
              <span className="shrink-0 opacity-85">
                +{product.car_count - 1}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export type PickingCustomerDisplay = {
  name: string;
  memberSku: string;
  tel: string;
  email: string;
  preparedAt: string | null;
  deliveryAt: string | null;
  sellerName: string;
  imageFileId: number | null;
};

export function PickingCustomerCard({
  customer,
  sku,
  locale,
  extraLabel,
  extraValue,
}: {
  customer: PickingCustomerDisplay;
  sku?: string | null;
  locale: DisplayLocale;
  /** One more dated fact under the seller, used by the claim desk for the receipt date. */
  extraLabel?: string;
  extraValue?: string | null;
}) {
  const tPage = useTranslations("page.orderPicking");
  const dash = tPage("emptyCell");
  const prepared = customer.preparedAt
    ? formatDateTime(customer.preparedAt, locale)
    : dash;
  const delivery = customer.deliveryAt
    ? formatDateTime(customer.deliveryAt, locale)
    : dash;

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        {customer.imageFileId != null ? (
          <ProductThumb fileId={customer.imageFileId} locale={locale} />
        ) : (
          <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
            <Building2 className="size-6" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-foreground truncate text-base font-semibold">
            {customer.name || dash}
            {sku?.trim() ? (
              <span className="text-muted-foreground ml-2 font-medium">
                {sku.trim()}
              </span>
            ) : null}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
            <div className="lg:pr-4">
              <p className="text-muted-foreground text-xs">
                {tPage("customerCode")}
              </p>
              <p className="text-foreground font-semibold">
                {customer.memberSku || dash}
              </p>
            </div>
            <div className="space-y-2 lg:px-4">
              <div>
                <p className="text-muted-foreground text-xs">
                  {tPage("customerTel")}
                </p>
                <p className="text-foreground font-semibold">
                  {customer.tel || dash}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {tPage("customerEmail")}
                </p>
                <p className="text-foreground font-semibold">
                  {customer.email || dash}
                </p>
              </div>
            </div>
            <div className="space-y-2 lg:px-4">
              <div>
                <p className="text-muted-foreground text-xs">
                  {tPage("preparedAt")}
                </p>
                <p className="text-foreground font-semibold">{prepared}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {tPage("deliverySchedule")}
                </p>
                <p className="text-foreground font-semibold">{delivery}</p>
              </div>
            </div>
            <div className="space-y-2 lg:pl-4">
              <div>
                <p className="text-muted-foreground text-xs">
                  {tPage("customerSeller")}
                </p>
                <p className="text-foreground font-semibold">
                  {customer.sellerName || dash}
                </p>
              </div>
              {extraLabel && extraValue ? (
                <div>
                  <p className="text-muted-foreground text-xs">{extraLabel}</p>
                  <p className="text-foreground font-semibold">
                    {formatDateTime(extraValue, locale)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PickingItemsPanel({
  orders,
  activeOrderId,
  onActiveOrderChange,
  itemsByOrder,
  productsById,
  selectedItemId,
  onSelectItem,
  onStatusChange,
  onAddToOrder,
  locale,
  readOnly = false,
  extraPay = false,
}: {
  orders: PickingOrderDetail[];
  activeOrderId: number;
  onActiveOrderChange: (id: number) => void;
  itemsByOrder: Map<number, PickingItemDetail[]>;
  productsById: Map<number, ProductItemBrowseRow>;
  selectedItemId: number | null;
  onSelectItem: (orderId: number, item: PickingItemDetail) => void;
  onStatusChange: (
    orderId: number,
    item: PickingItemDetail,
    status: PickingItemStatus
  ) => void;
  onAddToOrder: (orderId: number, item: PickingItemDetail) => void;
  locale: DisplayLocale;
  readOnly?: boolean;
  extraPay?: boolean;
}) {
  const tPage = useTranslations("page.orderPicking");
  const tCrud = useTranslations("crud");
  const [page, setPage] = useState(1);

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? orders[0];

  useEffect(() => {
    setPage(1);
  }, [activeOrderId]);

  if (!activeOrder) return null;

  const rows = sortPickingItems(itemsByOrder.get(activeOrder.id) ?? []);
  const paged = rows.slice((page - 1) * PANEL_PAGE_SIZE, page * PANEL_PAGE_SIZE);

  return (
    <div className="flex min-w-0 flex-col">
      <Tabs
        value={String(activeOrder.id)}
        onValueChange={(v) => onActiveOrderChange(Number(v))}
      >
        <TabsList className="h-auto w-fit flex-wrap justify-start gap-1 bg-transparent p-0">
          {orders.map((order, index) => (
            <TabsTrigger
              key={order.id}
              value={String(order.id)}
              className="data-[state=active]:border-primary data-[state=active]:text-primary bg-muted text-muted-foreground rounded-t-md rounded-b-none px-4 py-2 shadow-none data-[state=active]:border-b-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {tPage("pickingTab", { no: index + 1 })}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="rounded-tl-none">
        <CardContent className="flex flex-col gap-3">
          <p className="text-foreground text-sm font-medium">
            {tPage("pickingNumber", { sku: activeOrder.sku ?? "" })}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  {tPage("colNo")}
                </TableHead>
                <TableHead>{tPage("colProduct")}</TableHead>
                <TableHead className="text-center">
                  {tPage("ordered")}
                </TableHead>
                <TableHead className="text-center">
                  {tPage("checked")}
                </TableHead>
                <TableHead className="text-center">
                  {tPage("remaining")}
                </TableHead>
                <TableHead className="text-center">
                  {tPage("colStatus")}
                </TableHead>
                <TableHead className="text-center">
                  {tCrud("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {tPage("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((row, index) => {
                  const mapped = isMappedLine(row);
                  const left = remainingQty(row.amount, row.amount_checked);
                  const toggleTo = extraPay ? null : nextStoreCheckStatus(row);
                  const canAdd = !readOnly && (!mapped || left > 0);
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        selectedItemId === row.id && "bg-primary/5"
                      )}
                    >
                      <TableCell className="text-center">
                        <button
                          type="button"
                          className={cn(
                            "w-full cursor-pointer text-center",
                            selectedItemId === row.id &&
                              "text-primary font-semibold"
                          )}
                          onClick={() => onSelectItem(activeOrder.id, row)}
                        >
                          {(page - 1) * PANEL_PAGE_SIZE + index + 1}
                        </button>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <button
                          type="button"
                          className="w-full cursor-pointer text-left"
                          onClick={() => onSelectItem(activeOrder.id, row)}
                        >
                          <PickingProductCell
                            product={
                              row.product_item_id
                                ? productsById.get(row.product_item_id)
                                : undefined
                            }
                            detail={row.detail ?? ""}
                            locale={locale}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {row.amount.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center font-medium tabular-nums",
                          row.amount_checked >= row.amount
                            ? "text-warehouse-success-fg"
                            : row.amount_checked > 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        )}
                      >
                        {row.amount_checked.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center font-medium tabular-nums",
                          left > 0 ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {left.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          className={cn(
                            "inline-flex",
                            toggleTo && !readOnly
                              ? "cursor-pointer"
                              : "cursor-default"
                          )}
                          disabled={readOnly || !toggleTo}
                          onClick={() => {
                            if (readOnly || !toggleTo) return;
                            onStatusChange(activeOrder.id, row, toggleTo);
                          }}
                        >
                          <span className={pickingItemStatusPillClass(row.status)}>
                            {row.status === "in_progress"
                              ? tPage("status.storeCheck")
                              : tPage(`status.${row.status}`)}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <ButtonIcon
                            type="button"
                            variant="outline"
                            size="lg"
                            tone={mapped ? "add" : "edit"}
                            aria-label={
                              mapped
                                ? tPage("extraOrderQty")
                                : tCrud("btn.edit")
                            }
                            disabled={!canAdd}
                            onClick={() => {
                              if (!canAdd) return;
                              if (mapped) onAddToOrder(activeOrder.id, row);
                              else onSelectItem(activeOrder.id, row);
                            }}
                          >
                            {mapped ? (
                              <Plus className="text-current" aria-hidden />
                            ) : (
                              <SquarePen className="text-current" aria-hidden />
                            )}
                          </ButtonIcon>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {rows.length > PANEL_PAGE_SIZE ? (
            <CrudPaginationBar
              page={page}
              pageSize={PANEL_PAGE_SIZE}
              meta={{
                total: rows.length,
                totalPages: Math.ceil(rows.length / PANEL_PAGE_SIZE),
              }}
              onPageChange={setPage}
              onPageSizeChange={() => undefined}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export type PickingVerifySelection = {
  orderId: number | null;
  itemId: number | null;
  itemName: string;
  scan: string;
  qty: string;
};

export const BLANK_VERIFY: PickingVerifySelection = {
  orderId: null,
  itemId: null,
  itemName: "",
  scan: "",
  qty: "1",
};

export function PickingVerifyCard({
  selection,
  maxQty,
  onChange,
  onConfirm,
  disabled = false,
  qtyDisabled = false,
}: {
  selection: PickingVerifySelection;
  maxQty: number;
  onChange: (next: PickingVerifySelection) => void;
  onConfirm: () => void;
  disabled?: boolean;
  qtyDisabled?: boolean;
}) {
  const tPage = useTranslations("page.orderPicking");
  const idle = selection.itemId == null;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-primary text-lg font-semibold">
              {tPage("verifyTitle")}
            </h2>
            <CircleHelp className="text-muted-foreground size-4" aria-hidden />
          </div>
          <div className="shrink-0 text-right">
            <p className="text-muted-foreground text-xs">
              {tPage("selectedItem")}
            </p>
            <p className="text-foreground font-medium">
              {selection.itemName || tPage("emptyCell")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[7fr_3fr]">
          <div className="grid gap-1.5">
            <Label htmlFor="picking-scan">{tPage("scanBarcodeOrSku")}</Label>
            <div className="relative">
              <Barcode
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="picking-scan"
                className="pl-8"
                value={selection.scan}
                placeholder={tPage("scanBarcodeOrSku")}
                disabled={disabled || idle}
                onChange={(e) => onChange({ ...selection, scan: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !disabled && !idle) onConfirm();
                }}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="picking-qty">{tPage("qtyToCheck")}</Label>
            <Input
              id="picking-qty"
              type="number"
              min={1}
              max={Math.max(1, maxQty)}
              className="tabular-nums"
              value={selection.qty}
              disabled={disabled || qtyDisabled || idle}
              onChange={(e) => onChange({ ...selection, qty: e.target.value })}
            />
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={disabled || idle}
          onClick={onConfirm}
        >
          <Check className="text-current" aria-hidden />
          {tPage("confirmVerify")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function PickingLinesTable({
  lines,
  locale,
  onRemoveLine,
  readOnly = false,
}: {
  lines: PickingOrderLine[];
  locale: DisplayLocale;
  onRemoveLine?: (line: PickingOrderLine) => void;
  readOnly?: boolean;
}) {
  const tPage = useTranslations("page.orderPicking");
  const tCrud = useTranslations("crud");

  if (lines.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        {tPage("empty")}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{tPage("colProduct")}</TableHead>
          <TableHead className="text-center">{tPage("colQty")}</TableHead>
          <TableHead className="text-right">{tPage("colUnitPrice")}</TableHead>
          <TableHead className="text-right">{tPage("colDiscount")}</TableHead>
          <TableHead className="text-right">{tPage("colLineTotal")}</TableHead>
          {onRemoveLine ? <TableHead className="w-12" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={`${line.orderId}-${line.itemId}`}>
            <TableCell className="min-w-0">
              <PickingProductCell
                product={line.product}
                detail={line.detail}
                locale={locale}
              />
            </TableCell>
            <TableCell className="text-center tabular-nums">
              {line.qty.toLocaleString()}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {money(line.pricePerUnit, locale)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {money(line.discount, locale)}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {money(lineTotal(line.qty, line.pricePerUnit, line.discount), locale)}
            </TableCell>
            {onRemoveLine ? (
              <TableCell className="text-center">
                <ButtonIcon
                  tone="delete"
                  aria-label={tCrud("btn.delete")}
                  disabled={readOnly}
                  onClick={() => onRemoveLine(line)}
                >
                  <Trash2 className="text-current" aria-hidden />
                </ButtonIcon>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PickingPriceSummary({
  lines,
  vatPercent,
  specialDiscount = 0,
  onSpecialDiscountEdit,
  locale,
  summary,
}: {
  lines: PickingOrderLine[];
  vatPercent: number;
  specialDiscount?: number;
  onSpecialDiscountEdit?: () => void;
  locale: DisplayLocale;
  summary?: StoreSalesPriceSummary;
}) {
  const tPage = useTranslations("page.orderPicking");
  const total =
    summary ??
    computeStoreSalesPriceSummary(summaryLinesFromOrderLines(lines), vatPercent);
  const special = Math.max(0, Math.round(specialDiscount * 100) / 100);
  const payable = Math.max(0, Math.round((total.netTotal - special) * 100) / 100);

  return (
    <div className="bg-primary/10 border-primary/20 space-y-2 rounded-md border p-3">
      <div className="text-primary flex items-center gap-2 text-sm font-medium">
        <List className="size-4" aria-hidden />
        {tPage("priceSummary", { count: lines.length })}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">
            {tPage("itemsTotal", { count: lines.length })}
          </span>
          <span className="tabular-nums">{money(total.itemsTotal, locale)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{tPage("discountTotal")}</span>
          <span className="tabular-nums">
            {money(total.discountTotal, locale)}
          </span>
        </div>
        {onSpecialDiscountEdit || special > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {tPage("specialDiscountLabel")}
            </span>
            <span className="flex items-center gap-1">
              <span className="tabular-nums">{money(special, locale)}</span>
              {onSpecialDiscountEdit ? (
                <ButtonIcon
                  tone="edit"
                  size="xs"
                  aria-label={tPage("specialDiscountEditAria")}
                  onClick={onSpecialDiscountEdit}
                >
                  <SquarePen className="text-current" aria-hidden />
                </ButtonIcon>
              ) : null}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">
            {tPage("grandTotalExclVat")}
          </span>
          <span className="tabular-nums">{money(total.grandTotal, locale)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">
            {tPage("vatAmount", { pct: vatPercent })}
          </span>
          <span className="tabular-nums">{money(total.vatAmount, locale)}</span>
        </div>
      </div>
      <div className="border-primary/20 flex items-end justify-between gap-3 border-t pt-2">
        <span className="text-sm font-medium">{tPage("netTotalLabel")}</span>
        <span className="text-primary text-xl font-semibold tabular-nums">
          {money(payable, locale)} {tPage("currencyBaht")}
        </span>
      </div>
    </div>
  );
}

export function PickingOrderSummaryPanel({
  sku,
  orderDate,
  lines,
  vatPercent,
  locale,
  onRemoveLine,
  readOnly = false,
}: {
  sku: string;
  orderDate: string;
  lines: PickingOrderLine[];
  vatPercent: number;
  locale: DisplayLocale;
  onRemoveLine: (line: PickingOrderLine) => void;
  readOnly?: boolean;
}) {
  const tPage = useTranslations("page.orderPicking");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 border-b pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-warehouse-success-bg text-warehouse-success-fg flex size-10 shrink-0 items-center justify-center rounded-lg">
              <ShoppingBag className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-foreground truncate text-lg font-semibold">
                {tPage("orderTitle", { sku })}
              </h2>
              <p className="text-muted-foreground text-xs">
                {tPage("orderSubtitle")}
              </p>
            </div>
          </div>
          <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-sm">
            <Calendar className="size-4" aria-hidden />
            <div className="text-right">
              <p className="text-xs">{tPage("orderDate")}</p>
              <p className="text-foreground font-medium">{orderDate}</p>
            </div>
          </div>
        </div>

        <PickingLinesTable
          lines={lines}
          locale={locale}
          onRemoveLine={onRemoveLine}
          readOnly={readOnly}
        />

        <PickingPriceSummary
          lines={lines}
          vatPercent={vatPercent}
          locale={locale}
        />
      </CardContent>
    </Card>
  );
}

export type PickingExtraLine = {
  itemId: number;
  orderId: number;
  product?: ProductItemBrowseRow;
  qty: number;
  amountChecked: number;
  status: PickingItemStatus;
  pricePerUnit: number;
  discount: number;
  /** A line already saved on a child slip is history: it shows, but its quantity is fixed. */
  persisted: boolean;
};

export type PickingExtraCard = {
  key: string;
  orderId?: number;
  sku?: string;
  lines: PickingExtraLine[];
};

export function PickingExtraOrderPanel({
  cards,
  canSubmit,
  submitting = false,
  locale,
  onQtyChange,
  onRemoveLine,
  onSubmit,
}: {
  cards: PickingExtraCard[];
  canSubmit: boolean;
  submitting?: boolean;
  locale: DisplayLocale;
  onQtyChange: (cardKey: string, itemId: number, qty: number) => void;
  onRemoveLine: (cardKey: string, itemId: number) => void;
  onSubmit: (cardKey: string) => void;
}) {
  const tPage = useTranslations("page.orderPicking");
  const tCrud = useTranslations("crud");

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {cards.map((card) => {
        const editable = card.orderId == null;
        const canSubmitCard =
          canSubmit && editable && card.lines.some((l) => !l.persisted);
        return (
          <Card key={card.key}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-foreground text-lg font-semibold">
                  {tPage("extraOrderTitle")}
                  {card.sku ? (
                    <span className="text-muted-foreground ml-2 text-sm font-medium">
                      {card.sku}
                    </span>
                  ) : null}
                </h2>
                <Button
                  type="button"
                  disabled={!canSubmitCard || submitting}
                  onClick={() => onSubmit(card.key)}
                >
                  {tPage("submitExtraOrder")}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      {tPage("colNo")}
                    </TableHead>
                    <TableHead>{tPage("colProduct")}</TableHead>
                    <TableHead className="text-center">
                      {tPage("extraOrderQty")}
                    </TableHead>
                    <TableHead className="text-center">
                      {tPage("checked")}
                    </TableHead>
                    <TableHead className="text-center">
                      {tPage("colStatus")}
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {card.lines.map((line, index) => (
                    <TableRow key={`${card.key}-${line.itemId}`}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="min-w-0">
                        <PickingProductCell
                          product={line.product}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          className="mx-auto w-20 text-center tabular-nums"
                          value={String(line.qty)}
                          disabled={!canSubmit || submitting || line.persisted}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value, 10);
                            onQtyChange(
                              card.key,
                              line.itemId,
                              Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center tabular-nums">
                        {line.amountChecked.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={pickingItemStatusPillClass(line.status)}>
                          {line.status === "in_progress"
                            ? tPage("status.storeCheck")
                            : tPage(`status.${line.status}`)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {editable && !line.persisted ? (
                          <ButtonIcon
                            tone="delete"
                            aria-label={tCrud("btn.delete")}
                            disabled={!canSubmit || submitting}
                            onClick={() => onRemoveLine(card.key, line.itemId)}
                          >
                            <Trash2 className="text-current" aria-hidden />
                          </ButtonIcon>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function PickingFormFooter({
  canUpdate,
  canIssueLoan,
  canSettle,
  extraPay = false,
  onCancel,
  onSaveDraft,
  onIssueLoan,
  onPay,
}: {
  canUpdate: boolean;
  canIssueLoan: boolean;
  canSettle: boolean;
  extraPay?: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onIssueLoan: () => void;
  onPay: () => void;
}) {
  const tPage = useTranslations("page.orderPicking");
  const tCrud = useTranslations("crud");

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="outline" size="lg" onClick={onCancel}>
        {tCrud("btn.cancel")}
      </Button>
      {extraPay ? null : (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={!canUpdate}
          onClick={onSaveDraft}
        >
          {tCrud("btn.save")}
        </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        disabled={!canUpdate || !canIssueLoan || !canSettle}
        onClick={onIssueLoan}
      >
        {tPage("issueLoan")}
      </Button>
      <Button
        type="button"
        size="lg"
        disabled={!canUpdate || !canSettle}
        onClick={onPay}
      >
        {tPage("pay")}
      </Button>
    </div>
  );
}
