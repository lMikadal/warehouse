"use client";

import { AlertTriangle, Building2, Package, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { type DisplayLocale } from "@/lib/format-datetime";
import {
  createPurchase,
  fetchPurchaseDetail,
  loadPurchaseFilterOptions,
  OrderPurchaseApiError,
  resolvePurchaseFilterLabel,
  updatePurchase,
  type PurchaseItemInput,
  type PurchaseUnit,
} from "@/lib/order-purchase-api";
import { fetchOrderSalesFormItems } from "@/lib/order-sales-form-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import { cn } from "@/lib/utils";

import {
  computePurchaseDraftTotals,
  roundMoney,
} from "../_lib/purchase-totals";
import { PurchaseMoneySummary } from "./purchase-money-summary";

const COLUMN_COUNT = 7;
const REFILL_RESOURCE = "purchases" as const;
const DEFAULT_VAT_RATE = 7;

/** v1 refill chips (RefillFilter): all, already-ordered, below reorder point, discontinued. */
const REFILL_FILTERS = ["all", "ordered", "low_stock", "is_stop"] as const;
type RefillFilter = (typeof REFILL_FILTERS)[number];

type DraftLine = {
  key: string;
  productItemId: number;
  name: string;
  sku: string;
  unit: PurchaseUnit;
  qty: number;
  pricePerUnit: number;
  discount: number;
};

/** One supplier = one future purchase order, the way v1 grouped the staging cards. */
type DraftCard = {
  key: string;
  supplierId: string;
  supplierLabel: string;
  discount: number;
  note: string;
  lines: DraftLine[];
};

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function cardItems(card: DraftCard): PurchaseItemInput[] {
  return card.lines.map((line) => ({
    type: "catalog",
    product_item_id: line.productItemId,
    identification_number: "",
    qty: line.qty,
    free_gift: 0,
    unit: line.unit,
    price_per_unit: line.pricePerUnit,
    vat_rate: DEFAULT_VAT_RATE,
    discount: line.discount,
    note: "",
  }));
}

export type PurchaseRefillPanelProps = {
  /** A draft PO flagged is_waiting reopens here instead of the normal edit form. */
  editDraftId?: number | null;
  onEditDraftConsumed?: () => void;
  onPurchaseOrderCreated?: () => void;
};

export function PurchaseRefillPanel({
  editDraftId,
  onEditDraftConsumed,
  onPurchaseOrderCreated,
}: PurchaseRefillPanelProps) {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.orderPurchase");
  const tRefill = useTranslations("page.orderPurchase.refill");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const {
    page,
    pageSize,
    setPage,
    onPageSizeChange,
    query,
    onSearchChange,
    debouncedQuery,
    totalPages,
  } = useCrudListQuery();

  const [refillFilter, setRefillFilter] = useState<RefillFilter>("all");
  const [rows, setRows] = useState<ProductItemBrowseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [cards, setCards] = useState<DraftCard[]>([]);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [pendingSupplierId, setPendingSupplierId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** Set while the panel is editing an existing is_waiting draft rather than staging a new one. */
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOrderSalesFormItems(locale, REFILL_RESOURCE, {
        page,
        limit: pageSize,
        search: debouncedQuery || undefined,
        isActive: true,
        refillFilter: refillFilter === "all" ? undefined : refillFilter,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [locale, page, pageSize, debouncedQuery, refillFilter, tError]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reopening an is_waiting draft: rebuild one card from the saved PO so the same panel can edit it.
  const loadDraft = useCallback(
    async (id: number) => {
      try {
        const detail = await fetchPurchaseDetail(id);
        setEditingId(detail.id);
        setCards([
          {
            key: `po-${detail.id}`,
            supplierId: detail.supplier_user_id
              ? String(detail.supplier_user_id)
              : "",
            supplierLabel: detail.supplier_name?.trim() || "",
            discount: detail.discount,
            note: detail.note,
            lines: detail.items
              .filter((item) => item.product_item_id != null)
              .map((item) => ({
                key: `item-${item.id}`,
                productItemId: item.product_item_id as number,
                name: item.product_item_name?.trim() || item.name?.trim() || "",
                sku: item.product_item_sku?.trim() || "",
                unit: item.unit,
                qty: item.qty,
                pricePerUnit: item.price_per_unit,
                discount: item.discount,
              })),
          },
        ]);
      } catch (e) {
        toast.error(
          e instanceof OrderPurchaseApiError ? e.message : tError("loadFailed")
        );
      } finally {
        onEditDraftConsumed?.();
      }
    },
    [tError, onEditDraftConsumed]
  );

  useEffect(() => {
    if (editDraftId != null) void loadDraft(editDraftId);
  }, [editDraftId, loadDraft]);

  const stagedItemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const card of cards) {
      for (const line of card.lines) ids.add(line.productItemId);
    }
    return ids;
  }, [cards]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const addSelectedToSupplier = (supplierId: string, supplierLabel: string) => {
    const picked = rows.filter(
      (row) => selected[row.id] && !stagedItemIds.has(row.id)
    );
    if (picked.length === 0) return;
    setCards((prev) => {
      const newLines: DraftLine[] = picked.map((row) => ({
        key: `line-${row.id}`,
        productItemId: row.id,
        name: row.name,
        sku: row.sku,
        unit: (row.unit as PurchaseUnit) ?? "piece",
        qty: 1,
        pricePerUnit: row.price ?? 0,
        discount: 0,
      }));
      const index = prev.findIndex((card) => card.supplierId === supplierId);
      if (index >= 0) {
        const next = [...prev];
        next[index] = {
          ...next[index],
          lines: [...next[index].lines, ...newLines],
        };
        return next;
      }
      return [
        ...prev,
        {
          key: `card-${supplierId}-${Date.now()}`,
          supplierId,
          supplierLabel,
          discount: 0,
          note: "",
          lines: newLines,
        },
      ];
    });
    setSelected({});
  };

  const patchLine = (
    cardKey: string,
    lineKey: string,
    patch: Partial<DraftLine>
  ) => {
    setCards((prev) =>
      prev.map((card) =>
        card.key !== cardKey
          ? card
          : {
              ...card,
              lines: card.lines.map((line) =>
                line.key === lineKey ? { ...line, ...patch } : line
              ),
            }
      )
    );
  };

  const removeLine = (cardKey: string, lineKey: string) => {
    setCards((prev) =>
      prev
        .map((card) =>
          card.key !== cardKey
            ? card
            : { ...card, lines: card.lines.filter((l) => l.key !== lineKey) }
        )
        .filter((card) => card.lines.length > 0)
    );
  };

  /**
   * "Save draft" keeps the PO in the refill queue (is_waiting) so it reopens here; "submit" hands it
   * to the approval flow as a normal pending PO and drops the flag.
   */
  const submitCard = async (card: DraftCard, status: "draft" | "pending") => {
    if (!card.supplierId) {
      toast.error(tRefill("validationSupplier"));
      return;
    }
    if (card.lines.some((line) => line.qty < 1)) {
      toast.error(tRefill("validationQty"));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        status,
        supplier_user_id: Number(card.supplierId),
        vat_type: "exclude" as const,
        vat_rate: DEFAULT_VAT_RATE,
        discount: card.discount,
        special_discount: 0,
        is_waiting: status === "draft",
        note: card.note,
        items: cardItems(card),
      };
      if (editingId != null) await updatePurchase(locale, editingId, body);
      else await createPurchase(locale, body);
      toast.success(
        status === "draft" ? tCrud("toast.saved") : tRefill("draftCreated")
      );
      setCards((prev) => prev.filter((c) => c.key !== card.key));
      setEditingId(null);
      onPurchaseOrderCreated?.();
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <CrudSearchField
            value={query}
            onChange={onSearchChange}
            placeholder={tRefill("searchPlaceholder")}
            className="min-w-0 flex-1"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {REFILL_FILTERS.map((value) => {
            const active = refillFilter === value;
            return (
              <Button
                key={value}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                aria-pressed={active}
                onClick={() => {
                  setRefillFilter(value);
                  setSelected({});
                  setPage(1);
                }}
              >
                {tRefill(`chip.${value}`)}
              </Button>
            );
          })}
        </div>

        {selectedCount > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="text-sm">
              {tRefill("selectedCount", { count: selectedCount })}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setPendingSupplierId("");
                setSupplierDialogOpen(true);
              }}
            >
              {tRefill("assignSupplier")}
            </Button>
          </div>
        ) : null}

        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label={tCrud("table.selectAll")}
                    checked={
                      rows.length > 0 &&
                      rows.every(
                        (row) => selected[row.id] || stagedItemIds.has(row.id)
                      )
                    }
                    onCheckedChange={(checked) =>
                      setSelected(() => {
                        if (!checked) return {};
                        const next: Record<number, boolean> = {};
                        for (const row of rows) {
                          if (!stagedItemIds.has(row.id)) next[row.id] = true;
                        }
                        return next;
                      })
                    }
                  />
                </TableHead>
                <TableHead>{tRefill("colProduct")}</TableHead>
                <TableHead className="text-right tabular-nums">
                  {tRefill("colStock")}
                </TableHead>
                <TableHead className="text-right tabular-nums">
                  {tRefill("colMinimumStock")}
                </TableHead>
                <TableHead className="text-right tabular-nums">
                  {tRefill("colPricePerUnit")}
                </TableHead>
                <TableHead className="text-center">{tRefill("colUnit")}</TableHead>
                <TableHead className="text-center">{tRefill("colFlags")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <CrudListTableSkeleton
                  columnCount={COLUMN_COUNT}
                  rowCount={pageSize}
                />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="text-center">
                    {tRefill("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const staged = stagedItemIds.has(row.id);
                  const stock = row.available_stock ?? row.total_stock ?? 0;
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(staged && "opacity-50")}
                    >
                      <TableCell>
                        <Checkbox
                          aria-label={row.name}
                          disabled={staged}
                          checked={!!selected[row.id]}
                          onCheckedChange={(checked) =>
                            setSelected((s) => ({ ...s, [row.id]: !!checked }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-medium">{row.name}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {row.sku}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          row.low_stock && "font-medium text-warehouse-error-fg"
                        )}
                      >
                        {stock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.minimum_stock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(row.price ?? 0, locale)}
                      </TableCell>
                      <TableCell className="text-center">
                        {tPage(`unit.${row.unit}`)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {row.low_stock ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg"
                            >
                              <AlertTriangle className="size-3" aria-hidden />
                              {tRefill("flagLowStock")}
                            </Badge>
                          ) : null}
                          {row.is_stopped ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg"
                            >
                              <X className="size-3" aria-hidden />
                              {tRefill("flagStopped")}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <CrudPaginationBar
          page={page}
          pageSize={pageSize}
          meta={{ total, totalPages: totalPages(total) }}
          onPageChange={setPage}
          onPageSizeChange={(size) => onPageSizeChange(size as typeof pageSize)}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {cards.length === 0 ? (
          <Card className="shadow-none">
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Package className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {tRefill("draftEmpty")}
              </p>
            </CardContent>
          </Card>
        ) : (
          cards.map((card) => {
            const totals = computePurchaseDraftTotals(
              card.lines.map((line) => ({
                qty: line.qty,
                price_per_unit: line.pricePerUnit,
                discount: line.discount,
              })),
              {
                discount: card.discount,
                specialDiscount: 0,
                vatRate: DEFAULT_VAT_RATE,
              }
            );
            return (
              <Card key={card.key} className="shadow-none">
                <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
                  <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                    <Building2
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate">
                      {card.supplierLabel || tRefill("supplierUnnamed")}
                    </span>
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {tRefill("cardLineCount", { count: card.lines.length })}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {card.lines.map((line) => (
                    <div
                      key={line.key}
                      className="flex flex-col gap-2 rounded-md border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">
                            {line.name}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {line.sku}
                          </span>
                        </div>
                        <ButtonIcon
                          type="button"
                          variant="outline"
                          tone="delete"
                          size="sm"
                          aria-label={tCrud("btn.delete")}
                          onClick={() => removeLine(card.key, line.key)}
                        >
                          <Trash2 className="text-current" />
                        </ButtonIcon>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-qty`}>
                            {tRefill("colQty")}
                          </Label>
                          <Input
                            id={`${line.key}-qty`}
                            inputMode="numeric"
                            className="tabular-nums"
                            value={String(line.qty)}
                            onChange={(e) =>
                              patchLine(card.key, line.key, {
                                qty: Math.max(
                                  1,
                                  Math.floor(Number(e.target.value) || 0)
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-price`}>
                            {tRefill("colPricePerUnit")}
                          </Label>
                          <Input
                            id={`${line.key}-price`}
                            inputMode="decimal"
                            className="tabular-nums"
                            value={String(line.pricePerUnit)}
                            onChange={(e) =>
                              patchLine(card.key, line.key, {
                                pricePerUnit: roundMoney(
                                  Number(e.target.value) || 0
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-discount`}>
                            {tRefill("lineDiscountLabel")}
                          </Label>
                          <Input
                            id={`${line.key}-discount`}
                            inputMode="decimal"
                            className="tabular-nums"
                            value={String(line.discount)}
                            onChange={(e) =>
                              patchLine(card.key, line.key, {
                                discount: Math.max(
                                  0,
                                  roundMoney(Number(e.target.value) || 0)
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label htmlFor={`${card.key}-discount`}>
                        {tRefill("cardDiscount")}
                      </Label>
                      <Input
                        id={`${card.key}-discount`}
                        inputMode="decimal"
                        className="tabular-nums"
                        value={String(card.discount)}
                        onChange={(e) =>
                          setCards((prev) =>
                            prev.map((c) =>
                              c.key === card.key
                                ? {
                                    ...c,
                                    discount: Math.max(
                                      0,
                                      roundMoney(Number(e.target.value) || 0)
                                    ),
                                  }
                                : c
                            )
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`${card.key}-note`}>
                        {tRefill("cardNote")}
                      </Label>
                      <Textarea
                        id={`${card.key}-note`}
                        rows={2}
                        value={card.note}
                        onChange={(e) =>
                          setCards((prev) =>
                            prev.map((c) =>
                              c.key === card.key
                                ? { ...c, note: e.target.value }
                                : c
                            )
                          )
                        }
                      />
                    </div>
                  </div>

                  <PurchaseMoneySummary
                    totals={totals}
                    vatPercent={DEFAULT_VAT_RATE}
                  />

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => void submitCard(card, "draft")}
                    >
                      {tRefill("createDraft")}
                    </Button>
                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={() => void submitCard(card, "pending")}
                    >
                      {tRefill("submitPo")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tRefill("supplierDialogTitle")}</DialogTitle>
          </DialogHeader>
          <RemoteComboboxField
            label={tRefill("colSupplier")}
            value={pendingSupplierId}
            onValueChange={setPendingSupplierId}
            placeholder={tRefill("colSupplier")}
            emptyLabel={tError("noData")}
            inputClassName="w-full"
            onLoadOptions={(ctx) => loadPurchaseFilterOptions("suppliers", ctx)}
            resolveSelectedLabel={(v) =>
              resolvePurchaseFilterLabel("suppliers", v)
            }
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSupplierDialogOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!pendingSupplierId}
              onClick={async () => {
                const label =
                  (await resolvePurchaseFilterLabel(
                    "suppliers",
                    pendingSupplierId
                  )) ?? "";
                addSelectedToSupplier(pendingSupplierId, label);
                setSupplierDialogOpen(false);
              }}
            >
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
