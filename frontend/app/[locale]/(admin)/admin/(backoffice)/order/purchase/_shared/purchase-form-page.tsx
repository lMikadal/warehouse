"use client";

import { Building2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale } from "@/lib/format-datetime";
import {
  createPurchase,
  fetchPurchaseDetail,
  loadPurchaseFilterOptions,
  OrderPurchaseApiError,
  patchPurchaseStatus,
  resolvePurchaseFilterLabel,
  updatePurchase,
  type PurchaseDetail,
  type PurchaseItemInput,
  type PurchaseStatus,
  type PurchaseUnit,
  type PurchaseVatType,
} from "@/lib/order-purchase-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";

import { StoreSalesProductBrowsePanel } from "../../../sales/store/_shared/store-sales-product-browse-panel";
import {
  computePurchaseDraftTotals,
  roundMoney,
} from "../_lib/purchase-totals";
import { PurchaseMoneySummary } from "./purchase-money-summary";
import { PurchasePageFooter } from "./purchase-page-footer";
import { purchaseStatusPillClass } from "./purchase-status-styles";

const PURCHASE_UNITS: PurchaseUnit[] = ["piece", "box", "set"];
const VAT_TYPES: PurchaseVatType[] = ["exclude", "include", "none"];

type FormLine = {
  key: string;
  /** Set for lines already persisted on the order; new lines carry undefined. */
  id?: number;
  purchaseRequestItemId?: number | null;
  productItemId?: number | null;
  name: string;
  sku: string;
  unit: PurchaseUnit;
  qty: number;
  freeGift: number;
  pricePerUnit: number;
  discount: number;
  note: string;
};

function lineFromBrowseRow(row: ProductItemBrowseRow): FormLine {
  return {
    key: `catalog-${row.id}`,
    productItemId: row.id,
    name: row.name,
    sku: row.sku,
    unit: (row.unit as PurchaseUnit) ?? "piece",
    qty: 1,
    freeGift: 0,
    pricePerUnit: row.price ?? 0,
    discount: 0,
    note: "",
  };
}

/** v1 editable set: only a draft or a revision-requested PO can be changed. */
function isEditable(status: PurchaseStatus): boolean {
  return status === "draft" || status === "rejected";
}

export type PurchaseFormPageProps = { editId?: number };

export function PurchaseFormPage({ editId }: PurchaseFormPageProps) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPurchase");
  const tForm = useTranslations("page.orderPurchase.form");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_purchase");

  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [status, setStatus] = useState<PurchaseStatus>("draft");
  const [supplierId, setSupplierId] = useState("");
  const [vatType, setVatType] = useState<PurchaseVatType>("exclude");
  const [vatRate, setVatRate] = useState(7);
  const [discount, setDiscount] = useState(0);
  const [specialDiscount, setSpecialDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<FormLine[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  const readOnly = !!editId && !isEditable(status);

  const loadDetail = useCallback(async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const res = await fetchPurchaseDetail(editId);
      setDetail(res);
      setStatus(res.status);
      setSupplierId(res.supplier_user_id ? String(res.supplier_user_id) : "");
      setVatType(res.vat_type);
      setVatRate(res.vat_rate);
      setDiscount(res.discount);
      setSpecialDiscount(res.special_discount);
      setNote(res.note);
      setLines(
        res.items.map((item) => ({
          key: `item-${item.id}`,
          id: item.id,
          purchaseRequestItemId: item.purchase_request_item_id ?? null,
          productItemId: item.product_item_id ?? null,
          name: item.product_item_name?.trim() || item.name?.trim() || "",
          sku: item.product_item_sku?.trim() || "",
          unit: item.unit,
          qty: item.qty,
          freeGift: item.free_gift,
          pricePerUnit: item.price_per_unit,
          discount: item.discount,
          note: item.note,
        }))
      );
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [editId, tError]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const totals = useMemo(
    () =>
      computePurchaseDraftTotals(
        lines.map((line) => ({
          qty: line.qty,
          price_per_unit: line.pricePerUnit,
          discount: line.discount,
        })),
        {
          discount,
          specialDiscount,
          vatRate: vatType === "none" ? 0 : vatRate,
        }
      ),
    [lines, discount, specialDiscount, vatType, vatRate]
  );

  const cartQtyByItemId = useMemo(() => {
    const out: Record<number, number> = {};
    for (const line of lines) {
      if (line.productItemId != null) {
        out[line.productItemId] = (out[line.productItemId] ?? 0) + line.qty;
      }
    }
    return out;
  }, [lines]);

  const addLine = useCallback((row: ProductItemBrowseRow) => {
    setLines((prev) => {
      const index = prev.findIndex((line) => line.productItemId === row.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], qty: next[index].qty + 1 };
        return next;
      }
      return [...prev, lineFromBrowseRow(row)];
    });
  }, []);

  const patchLine = (key: string, patch: Partial<FormLine>) =>
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );

  const itemsPayload = (): PurchaseItemInput[] =>
    lines.map((line) => ({
      id: line.id,
      purchase_request_item_id: line.purchaseRequestItemId ?? undefined,
      type: line.productItemId != null ? "catalog" : "custom",
      product_item_id: line.productItemId ?? undefined,
      name: line.productItemId != null ? undefined : line.name,
      identification_number: "",
      qty: line.qty,
      free_gift: line.freeGift,
      unit: line.unit,
      price_per_unit: line.pricePerUnit,
      vat_rate: vatType === "none" ? 0 : vatRate,
      discount: line.discount,
      note: line.note,
    }));

  const save = async (nextStatus: PurchaseStatus) => {
    if (!supplierId) {
      toast.error(tForm("validationSupplier"));
      return;
    }
    if (lines.length === 0) {
      toast.error(tForm("validationNoItems"));
      return;
    }
    if (lines.some((line) => line.qty < 1)) {
      toast.error(tForm("errorQtyRequired"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        status: nextStatus,
        supplier_user_id: Number(supplierId),
        purchase_request_id: detail?.purchase_request_id ?? undefined,
        vat_type: vatType,
        vat_rate: vatType === "none" ? 0 : vatRate,
        discount,
        special_discount: specialDiscount,
        note,
        items: itemsPayload(),
      };
      if (editId) await updatePurchase(locale, editId, body);
      else await createPurchase(locale, body);
      toast.success(tCrud("toast.saved"));
      router.push("/admin/order/purchase");
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  /** v1 requires a reason before a pending/paying PO can be cancelled; it lands in the PO note. */
  const cancelOrder = async () => {
    if (!editId) return;
    if (!cancelNote.trim()) {
      toast.error(tForm("errorCancelNoteRequired"));
      return;
    }
    setSaving(true);
    try {
      await patchPurchaseStatus(locale, editId, "cancelled", cancelNote.trim());
      toast.success(tForm("toastCancelled"));
      router.push("/admin/order/purchase");
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSaving(false);
      setCancelOpen(false);
    }
  };

  const canCancel =
    !!editId && (status === "pending" || status === "paying") && perms.update;

  if (!perms.view || (editId ? !perms.update : !perms.create)) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    );
  }

  const displayNumber =
    detail?.sku?.trim() || detail?.sku_draft?.trim() || tForm("numberPending");

  return (
    <div className="flex w-full min-w-0 flex-col pb-20">
      <CrudPageHeader
        title={editId ? tForm("titleEdit") : tForm("titleCreate")}
        description={
          <span className="flex flex-wrap items-center gap-2 tabular-nums">
            {displayNumber}
            {editId ? (
              <>
                <span className="text-muted-foreground">
                  {tForm("statusLabel")}
                </span>
                <Badge
                  variant="secondary"
                  className={purchaseStatusPillClass(status)}
                >
                  {tPage(`status.${status}`)}
                </Badge>
              </>
            ) : null}
          </span>
        }
      />

      {status === "rejected" && note.trim() ? (
        <Card className="mb-4 border-warehouse-error-border bg-warehouse-error-bg shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-warehouse-error-fg">
              {tForm("rejectReasonHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="whitespace-pre-wrap text-sm">{note}</p>
          </CardContent>
        </Card>
      ) : null}

      {readOnly ? (
        <p className="mb-3 text-sm text-muted-foreground">
          {tForm("readOnlyHint")}
        </p>
      ) : null}

      <div className="h-[min(85vh,56rem)] min-h-[480px] w-full">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full gap-2 rounded-md"
        >
          <ResizablePanel defaultSize={58} minSize={30} className="min-w-0">
            <Card className="flex h-full flex-col overflow-hidden py-0 shadow-none">
              <CardHeader className="shrink-0 pb-3 pt-4">
                <CardTitle className="text-base">
                  {tForm("sectionProduct")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
                <StoreSalesProductBrowsePanel
                  resource="purchases"
                  onAdd={addLine}
                  cartQtyByItemId={cartQtyByItemId}
                  disabled={readOnly}
                  allowOutOfStock
                />
              </CardContent>
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle className="w-2 max-w-[6px] bg-primary/30" />
          <ResizablePanel defaultSize={42} minSize={30} className="min-w-0">
            <Card className="flex h-full flex-col overflow-hidden py-0 shadow-none">
              <CardHeader className="shrink-0 pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  {tForm("sectionLines")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
                <RemoteComboboxField
                  label={tForm("supplier")}
                  value={supplierId}
                  onValueChange={setSupplierId}
                  placeholder={tForm("selectSupplier")}
                  emptyLabel={tError("noData")}
                  inputClassName="w-full"
                  disabled={readOnly}
                  showClear
                  onLoadOptions={(ctx) =>
                    loadPurchaseFilterOptions("suppliers", ctx)
                  }
                  resolveSelectedLabel={(v) =>
                    resolvePurchaseFilterLabel("suppliers", v)
                  }
                />

                {lines.length === 0 ? (
                  <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {tForm("linesEmpty")}
                  </p>
                ) : (
                  lines.map((line) => (
                    <div
                      key={line.key}
                      className="flex flex-col gap-2 rounded-md border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">
                            {line.name}
                          </span>
                          {line.sku ? (
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {line.sku}
                            </span>
                          ) : null}
                        </div>
                        <ButtonIcon
                          type="button"
                          variant="outline"
                          tone="delete"
                          size="sm"
                          disabled={readOnly}
                          aria-label={tCrud("btn.delete")}
                          onClick={() =>
                            setLines((prev) =>
                              prev.filter((l) => l.key !== line.key)
                            )
                          }
                        >
                          <Trash2 className="text-current" />
                        </ButtonIcon>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-qty`}>
                            {tForm("colQty")}
                          </Label>
                          <Input
                            id={`${line.key}-qty`}
                            inputMode="numeric"
                            className="tabular-nums"
                            disabled={readOnly}
                            value={String(line.qty)}
                            onChange={(e) =>
                              patchLine(line.key, {
                                qty: Math.max(
                                  1,
                                  Math.floor(Number(e.target.value) || 0)
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-unit`}>
                            {tForm("colUnit")}
                          </Label>
                          <Select
                            value={line.unit}
                            disabled={readOnly}
                            onValueChange={(v) =>
                              patchLine(line.key, { unit: v as PurchaseUnit })
                            }
                          >
                            <SelectTrigger id={`${line.key}-unit`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PURCHASE_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {tPage(`unit.${unit}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-price`}>
                            {tForm("colPricePerUnit")}
                          </Label>
                          <Input
                            id={`${line.key}-price`}
                            inputMode="decimal"
                            className="tabular-nums"
                            disabled={readOnly}
                            value={String(line.pricePerUnit)}
                            onChange={(e) =>
                              patchLine(line.key, {
                                pricePerUnit: roundMoney(
                                  Number(e.target.value) || 0
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-discount`}>
                            {tForm("colLineDiscount")}
                          </Label>
                          <Input
                            id={`${line.key}-discount`}
                            inputMode="decimal"
                            className="tabular-nums"
                            disabled={readOnly}
                            value={String(line.discount)}
                            onChange={(e) =>
                              patchLine(line.key, {
                                discount: Math.max(
                                  0,
                                  roundMoney(Number(e.target.value) || 0)
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-free`}>
                            {tForm("colFreeGift")}
                          </Label>
                          <Input
                            id={`${line.key}-free`}
                            inputMode="numeric"
                            className="tabular-nums"
                            disabled={readOnly}
                            value={String(line.freeGift)}
                            onChange={(e) =>
                              patchLine(line.key, {
                                freeGift: Math.max(
                                  0,
                                  Math.floor(Number(e.target.value) || 0)
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`${line.key}-note`}>
                            {tForm("note")}
                          </Label>
                          <Input
                            id={`${line.key}-note`}
                            disabled={readOnly}
                            value={line.note}
                            onChange={(e) =>
                              patchLine(line.key, { note: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="purchase-vat-type">{tForm("vatType")}</Label>
                    <Select
                      value={vatType}
                      disabled={readOnly}
                      onValueChange={(v) => setVatType(v as PurchaseVatType)}
                    >
                      <SelectTrigger id="purchase-vat-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {tPage(`vatType.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="purchase-vat-rate">{tForm("vatRate")}</Label>
                    <Input
                      id="purchase-vat-rate"
                      inputMode="decimal"
                      className="tabular-nums"
                      disabled={readOnly || vatType === "none"}
                      value={String(vatRate)}
                      onChange={(e) =>
                        setVatRate(
                          Math.min(
                            100,
                            Math.max(0, roundMoney(Number(e.target.value) || 0))
                          )
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="purchase-discount">
                      {tForm("discount")}
                    </Label>
                    <Input
                      id="purchase-discount"
                      inputMode="decimal"
                      className="tabular-nums"
                      disabled={readOnly}
                      value={String(discount)}
                      onChange={(e) =>
                        setDiscount(
                          Math.max(0, roundMoney(Number(e.target.value) || 0))
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="purchase-special-discount">
                      {tForm("specialDiscount")}
                    </Label>
                    <Input
                      id="purchase-special-discount"
                      inputMode="decimal"
                      className="tabular-nums"
                      disabled={readOnly}
                      value={String(specialDiscount)}
                      onChange={(e) =>
                        setSpecialDiscount(
                          Math.max(0, roundMoney(Number(e.target.value) || 0))
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="purchase-note">{tForm("note")}</Label>
                  <Textarea
                    id="purchase-note"
                    rows={2}
                    disabled={readOnly}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <PurchaseMoneySummary
                  totals={totals}
                  vatPercent={vatType === "none" ? 0 : vatRate}
                />
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tForm("cancelDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1">
            <Label htmlFor="purchase-cancel-note">
              {tForm("cancelNoteLabel")}
            </Label>
            <Textarea
              id="purchase-cancel-note"
              rows={3}
              value={cancelNote}
              placeholder={tForm("cancelNotePlaceholder")}
              onChange={(e) => setCancelNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={() => void cancelOrder()}
            >
              {tForm("cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PurchasePageFooter>
        {canCancel ? (
          <Button
            type="button"
            variant="outline"
            className="border-warehouse-error-border text-warehouse-error-fg hover:bg-warehouse-error-bg"
            disabled={saving}
            onClick={() => {
              setCancelNote("");
              setCancelOpen(true);
            }}
          >
            {tForm("cancelOrder")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/order/purchase")}
        >
          {tCrud("btn.back")}
        </Button>
        {readOnly ? null : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void save("draft")}
            >
              {tForm("saveDraft")}
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void save("pending")}
            >
              {tForm("submit")}
            </Button>
          </>
        )}
      </PurchasePageFooter>
    </div>
  );
}
