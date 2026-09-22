"use client";

// ponytail: browse column forked from quotation-form-page; ticket lines replace the priced cart.

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchOrderSalesFormItemsByIds,
  fetchOrderSalesFormMember,
  loadOrderSalesCarBrandComboboxOptions,
  loadOrderSalesCarModelComboboxOptions,
  loadOrderSalesMemberComboboxOptions,
  resolveOrderSalesCarBrandLabel,
  resolveOrderSalesCarModelLabel,
} from "@/lib/order-sales-form-api";
import {
  createTicket,
  fetchTicketDetail,
  loadTicketFilterOptions,
  OrderTicketApiError,
  resolveTicketFilterLabel,
  updateTicket,
  type TicketItemInput,
  type TicketStatus,
} from "@/lib/order-ticket-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import type { ImageUploadItem } from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

import { StoreSalesProductBrowsePanel } from "../../store/_shared/store-sales-product-browse-panel";
import {
  clampQtySell,
  DEFAULT_QTY_SELL,
  preliminaryQtyReorder,
  sumLineDeposits,
} from "../_lib/ticket-line-helpers";
import {
  TicketLinesPanel,
  type TicketFormLine,
  type TicketUnit,
} from "./ticket-lines-panel";

const TICKET_RESOURCE = "tickets" as const;
const stepBadgeClass =
  "bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold";

type CustomDraft = {
  name: string;
  brandId: string;
  modelId: string;
  engineId: string;
  identificationNumber: string;
  note: string;
  qtySell: number;
  qtyReorder: number;
  unit: TicketUnit;
  deposit: string;
};

const EMPTY_CUSTOM_DRAFT: CustomDraft = {
  name: "",
  brandId: "",
  modelId: "",
  engineId: "",
  identificationNumber: "",
  note: "",
  qtySell: DEFAULT_QTY_SELL,
  qtyReorder: DEFAULT_QTY_SELL,
  unit: "piece",
  deposit: "",
};

function lineFromBrowseRow(row: ProductItemBrowseRow): TicketFormLine {
  const stock = row.available_stock ?? row.total_stock ?? 0;
  return {
    key: `catalog-${row.id}`,
    type: "catalog",
    productItemId: row.id,
    productName: row.name,
    productSku: row.sku,
    brandName: row.brand_name ?? "",
    stockQty: stock,
    brandId: "",
    modelId: "",
    engineId: "",
    identificationNumber: "",
    note: "",
    systemFileIds: [],
    qtySell: DEFAULT_QTY_SELL,
    qtyReorder: preliminaryQtyReorder(DEFAULT_QTY_SELL, stock),
    unit: (row.unit as TicketUnit) ?? "piece",
    deposit: "",
  };
}

type Props = { editId?: number };

export function TicketFormPage({ editId }: Props) {
  const locale = useLocale();
  const displayLocale = locale as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderTicket");
  const tForm = useTranslations("page.orderTicket.form");
  const tStoreForm = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");
  const tFormRoot = useTranslations("form");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_ticket");
  const productStepRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<TicketStatus>("draft");
  const [sku, setSku] = useState("");
  const [channelId, setChannelId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [memberLabel, setMemberLabel] = useState("");
  const [customerSku, setCustomerSku] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerTel, setCustomerTel] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [dateReceive, setDateReceive] = useState("");
  const [lines, setLines] = useState<TicketFormLine[]>([]);
  const [note, setNote] = useState("");
  const [grandDepositOverride, setGrandDepositOverride] = useState<string | null>(
    null
  );

  const [tab, setTab] = useState<"catalog" | "custom">("catalog");
  const [customDraft, setCustomDraft] = useState<CustomDraft>(EMPTY_CUSTOM_DRAFT);
  const [customImages, setCustomImages] = useState<ImageUploadItem[]>([]);

  const readOnly = !!editId && status !== "draft";

  const loadDetail = useCallback(async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const d = await fetchTicketDetail(editId);
      setStatus(d.status);
      setSku(d.sku ?? "");
      setChannelId(
        d.setting_sale_channel_id ? String(d.setting_sale_channel_id) : ""
      );
      setPaymentMethodId(
        d.setting_payment_method_id ? String(d.setting_payment_method_id) : ""
      );
      setNote(d.note ?? "");
      if (d.customer) {
        setMemberId(
          d.customer.member_user_id ? String(d.customer.member_user_id) : ""
        );
        setCustomerSku(d.customer.sku ?? "");
        setCustomerName(d.customer.name ?? "");
        setMemberLabel(d.customer.name ?? "");
        setCustomerTel(d.customer.tel ?? "");
        setCustomerEmail(d.customer.email ?? "");
        setDateReceive(d.customer.date_receive?.slice(0, 10) ?? "");
      }
      const catalogIds = d.items
        .map((it) => it.product_item_id)
        .filter((id): id is number => typeof id === "number" && id > 0);
      let stockById: Record<number, number> = {};
      if (catalogIds.length > 0) {
        try {
          const rows = await fetchOrderSalesFormItemsByIds(
            locale,
            TICKET_RESOURCE,
            catalogIds
          );
          stockById = Object.fromEntries(
            rows.map((r) => [r.id, r.available_stock ?? r.total_stock ?? 0])
          );
        } catch {
          /* ponytail: show lines without live stock when browse lookup fails */
        }
      }
      setLines(
        d.items.map((it) => ({
          key: `loaded-${it.id}`,
          itemId: it.id,
          type: it.type,
          productItemId: it.product_item_id ?? undefined,
          productName:
            (it.type === "catalog" ? it.product_item_name : it.name) ?? "",
          productSku: it.product_item_sku ?? "",
          brandName: it.brand_name ?? "",
          stockQty:
            it.product_item_id != null
              ? (stockById[it.product_item_id] ?? it.stock_qty)
              : it.stock_qty,
          brandId: it.product_attribute_brand_id
            ? String(it.product_attribute_brand_id)
            : "",
          modelId: it.product_attribute_model_id
            ? String(it.product_attribute_model_id)
            : "",
          engineId: it.product_attribute_engine_id
            ? String(it.product_attribute_engine_id)
            : "",
          identificationNumber: it.identification_number ?? "",
          note: it.note ?? "",
          systemFileIds: it.files.map((f) => f.system_file_id),
          qtySell: it.qty_sell,
          qtyReorder: it.qty_reorder,
          unit: (it.unit as TicketUnit) || "piece",
          deposit: it.deposit ? String(it.deposit) : "",
        }))
      );
      const auto = d.total_deposit_old + d.total_deposit_new;
      setGrandDepositOverride(
        Math.abs(auto - d.total_deposit) > 0.0001 ? String(d.total_deposit) : null
      );
    } catch {
      toast.error(tError("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [editId, locale, tError]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const onMemberChange = async (nextId: string) => {
    setMemberId(nextId);
    if (!nextId) return;
    try {
      const m = await fetchOrderSalesFormMember(
        locale,
        TICKET_RESOURCE,
        Number(nextId)
      );
      setCustomerSku(m.sku ?? "");
      setCustomerName(m.name ?? "");
      setMemberLabel(m.name ?? "");
      setCustomerTel(m.tel ?? "");
      setCustomerEmail(m.email ?? "");
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  const addCatalogLine = useCallback((row: ProductItemBrowseRow) => {
    setLines((prev) => {
      const existing = prev.find(
        (l) => l.type === "catalog" && l.productItemId === row.id
      );
      if (existing) {
        const qtySell = clampQtySell(existing.qtySell + 1);
        return prev.map((l) =>
          l.key === existing.key
            ? {
                ...l,
                qtySell,
                qtyReorder: preliminaryQtyReorder(qtySell, l.stockQty),
              }
            : l
        );
      }
      return [...prev, lineFromBrowseRow(row)];
    });
  }, []);

  const addCustomLine = () => {
    if (!customDraft.name.trim()) {
      toast.error(
        tFormRoot("validation.required", { label: tForm("newName") })
      );
      return;
    }
    const remoteIds = customImages
      .filter((i): i is Extract<ImageUploadItem, { kind: "remote" }> =>
        i.kind === "remote"
      )
      .map((i) => i.id);
    setLines((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}-${prev.length}`,
        type: "custom",
        productName: customDraft.name.trim(),
        productSku: "",
        brandName: "",
        stockQty: 0,
        brandId: customDraft.brandId,
        modelId: customDraft.modelId,
        engineId: customDraft.engineId,
        identificationNumber: customDraft.identificationNumber.trim(),
        note: customDraft.note.trim(),
        systemFileIds: remoteIds,
        qtySell: clampQtySell(customDraft.qtySell),
        qtyReorder: clampQtySell(customDraft.qtyReorder),
        unit: customDraft.unit,
        deposit: customDraft.deposit,
      },
    ]);
    setCustomDraft(EMPTY_CUSTOM_DRAFT);
    setCustomImages([]);
  };

  const onLineChange = (key: string, patch: Partial<TicketFormLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.qtySell !== undefined) {
          next.qtySell = clampQtySell(patch.qtySell);
          if (next.type === "catalog") {
            next.qtyReorder = preliminaryQtyReorder(next.qtySell, next.stockQty);
          }
        }
        if (patch.qtyReorder !== undefined) {
          next.qtyReorder = clampQtySell(patch.qtyReorder);
        }
        return next;
      })
    );
  };

  const cartQtyByItemId = useMemo(() => {
    const m: Record<number, number> = {};
    for (const l of lines) {
      if (l.type !== "catalog" || !l.productItemId) continue;
      m[l.productItemId] = (m[l.productItemId] ?? 0) + l.qtySell;
    }
    return m;
  }, [lines]);

  const validate = (): boolean => {
    if (!customerName.trim() || !customerTel.trim()) {
      toast.error(tForm("validationCustomer"));
      return false;
    }
    if (customerEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)) {
      toast.error(tForm("validationEmail"));
      return false;
    }
    if (lines.length === 0) {
      toast.error(tForm("validationNoItems"));
      return false;
    }
    return true;
  };

  const save = async (nextStatus: Extract<TicketStatus, "draft" | "pending">) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const catalogLines = lines.filter((l) => l.type === "catalog");
      const customLines = lines.filter((l) => l.type === "custom");
      const depositOld = sumLineDeposits(catalogLines);
      const depositNew = sumLineDeposits(customLines);
      const items: TicketItemInput[] = lines.map((l) => ({
        ...(l.itemId != null ? { id: l.itemId } : {}),
        type: l.type,
        product_item_id: l.productItemId ?? null,
        name: l.type === "custom" ? l.productName : null,
        product_attribute_brand_id: l.brandId ? Number(l.brandId) : null,
        product_attribute_model_id: l.modelId ? Number(l.modelId) : null,
        product_attribute_engine_id: l.engineId ? Number(l.engineId) : null,
        identification_number: l.identificationNumber,
        qty_sell: l.qtySell,
        qty_reorder: l.qtyReorder,
        deposit: parseFloat(l.deposit) || 0,
        unit: l.unit,
        note: l.note,
        system_file_ids: l.systemFileIds,
      }));
      const body = {
        status: nextStatus,
        setting_sale_channel_id: channelId ? Number(channelId) : null,
        setting_payment_method_id: paymentMethodId
          ? Number(paymentMethodId)
          : null,
        total_deposit_old: depositOld,
        total_deposit_new: depositNew,
        total_deposit:
          grandDepositOverride != null && grandDepositOverride.trim() !== ""
            ? parseFloat(grandDepositOverride) || 0
            : depositOld + depositNew,
        note,
        customer: {
          member_user_id: memberId ? Number(memberId) : null,
          sku: customerSku,
          name: customerName.trim(),
          tel: customerTel.trim(),
          email: customerEmail.trim(),
          date_receive: dateReceive ? `${dateReceive}T00:00:00.000Z` : null,
        },
        items,
      };
      if (editId) {
        await updateTicket(locale, editId, body);
        toast.success(tCrud("toast.saved"));
        router.push(`/admin/sales/ticket/${editId}/detail`);
        return;
      }
      const created = await createTicket(locale, body);
      toast.success(tCrud("toast.created"));
      router.push(`/admin/sales/ticket/${created.id}/detail`);
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  if (!perms.view && editId) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }
  if (!perms.create && !editId) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }


  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-20">
      <CrudPageHeader
        title={editId ? tForm("titleEdit") : tForm("titleCreate")}
        description={sku || tPage("subtitle")}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={stepBadgeClass}>1</span>
                {tForm("sectionCustomer")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 overflow-visible">
              <div className="grid gap-3 md:grid-cols-2">
                <RemoteComboboxField
                  id="ticket-channel"
                  label={tForm("selectChannel")}
                  value={channelId}
                  onValueChange={setChannelId}
                  placeholder={tFormRoot("placeholder.select", {
                    label: tForm("selectChannel"),
                  })}
                  emptyLabel={tFormRoot("combobox.noResults")}
                  inputClassName="w-full"
                  showClear
                  disabled={readOnly}
                  onLoadOptions={(ctx) =>
                    loadTicketFilterOptions("sale_channels", ctx)
                  }
                  resolveSelectedLabel={(v) =>
                    resolveTicketFilterLabel("sale_channels", v)
                  }
                />
                <RemoteComboboxField
                  id="ticket-payment-method"
                  label={tForm("paymentMethod")}
                  value={paymentMethodId}
                  onValueChange={setPaymentMethodId}
                  placeholder={tFormRoot("placeholder.select", {
                    label: tForm("paymentMethod"),
                  })}
                  emptyLabel={tFormRoot("combobox.noResults")}
                  inputClassName="w-full"
                  showClear
                  disabled={readOnly}
                  onLoadOptions={(ctx) =>
                    loadTicketFilterOptions("payment_methods", ctx)
                  }
                  resolveSelectedLabel={(v) =>
                    resolveTicketFilterLabel("payment_methods", v)
                  }
                />
              </div>

              <RemoteComboboxField
                id="ticket-member"
                label={tForm("customerSku")}
                value={memberId}
                onValueChange={(v) => void onMemberChange(v)}
                placeholder={tStoreForm("memberCodeSearchPlaceholder")}
                emptyLabel={tFormRoot("combobox.noResults")}
                inputClassName="w-full"
                showClear={!readOnly}
                disabled={readOnly}
                pinnedItems={
                  memberId && memberLabel
                    ? [{ value: memberId, label: memberLabel }]
                    : []
                }
                onLoadOptions={({ search, signal }) =>
                  loadOrderSalesMemberComboboxOptions(locale, TICKET_RESOURCE, {
                    search,
                    signal,
                  })
                }
                resolveSelectedLabel={() => Promise.resolve(memberLabel || null)}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor="ticket-customer-name">
                    {tForm("customerName")}
                  </Label>
                  <Input
                    id="ticket-customer-name"
                    value={customerName}
                    disabled={readOnly}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ticket-customer-tel">
                    {tForm("customerTel")}
                  </Label>
                  <Input
                    id="ticket-customer-tel"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={customerTel}
                    disabled={readOnly}
                    onChange={(e) => setCustomerTel(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ticket-customer-email">
                    {tForm("customerEmail")}
                  </Label>
                  <Input
                    id="ticket-customer-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={customerEmail}
                    disabled={readOnly}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ticket-date-receive">
                    {tForm("customerDateReceive")}
                  </Label>
                  <Input
                    id="ticket-date-receive"
                    type="date"
                    value={dateReceive}
                    disabled={readOnly}
                    onChange={(e) => setDateReceive(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card ref={productStepRef} className="scroll-mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={stepBadgeClass}>2</span>
                {tForm("sectionProduct")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex w-full items-center gap-2 border-b border-border">
                {(["catalog", "custom"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "-mb-px border-b-2 px-1 py-2.5 text-sm font-medium",
                      tab === key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    aria-current={tab === key ? "page" : undefined}
                    onClick={() => setTab(key)}
                  >
                    {key === "catalog" ? tForm("tabExisting") : tForm("tabNew")}
                  </button>
                ))}
              </div>

              {tab === "catalog" ? (
                <StoreSalesProductBrowsePanel
                  resource={TICKET_RESOURCE}
                  onAdd={addCatalogLine}
                  cartQtyByItemId={cartQtyByItemId}
                  disabled={readOnly}
                  allowOutOfStock
                />
              ) : (
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="ticket-new-name">{tForm("newName")}</Label>
                    <Input
                      id="ticket-new-name"
                      value={customDraft.name}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCustomDraft((d) => ({ ...d, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <RemoteComboboxField
                      label={tForm("newBrand")}
                      value={customDraft.brandId}
                      onValueChange={(v) =>
                        setCustomDraft((d) => ({ ...d, brandId: v, modelId: "" }))
                      }
                      placeholder={tFormRoot("placeholder.select", {
                        label: tForm("newBrand"),
                      })}
                      emptyLabel={tFormRoot("combobox.noResults")}
                      inputClassName="w-full"
                      showClear
                      disabled={readOnly}
                      onLoadOptions={(ctx) =>
                        loadOrderSalesCarBrandComboboxOptions(
                          displayLocale,
                          TICKET_RESOURCE,
                          { search: ctx.search, signal: ctx.signal }
                        )
                      }
                      resolveSelectedLabel={async (value) => {
                        const id = Number(value);
                        if (!Number.isFinite(id)) return null;
                        return resolveOrderSalesCarBrandLabel(
                          displayLocale,
                          TICKET_RESOURCE,
                          id
                        );
                      }}
                    />
                    <RemoteComboboxField
                      label={tForm("newModel")}
                      value={customDraft.modelId}
                      onValueChange={(v) =>
                        setCustomDraft((d) => ({ ...d, modelId: v }))
                      }
                      placeholder={tFormRoot("placeholder.select", {
                        label: tForm("newModel"),
                      })}
                      emptyLabel={tFormRoot("combobox.noResults")}
                      inputClassName="w-full"
                      showClear
                      disabled={readOnly || !customDraft.brandId}
                      onLoadOptions={(ctx) =>
                        loadOrderSalesCarModelComboboxOptions(
                          displayLocale,
                          TICKET_RESOURCE,
                          {
                            search: ctx.search,
                            signal: ctx.signal,
                            parentId: customDraft.brandId
                              ? Number(customDraft.brandId)
                              : undefined,
                          }
                        )
                      }
                      resolveSelectedLabel={async (value) => {
                        const id = Number(value);
                        if (!Number.isFinite(id)) return null;
                        return resolveOrderSalesCarModelLabel(
                          displayLocale,
                          TICKET_RESOURCE,
                          id
                        );
                      }}
                    />
                    <div className="grid gap-1">
                      <Label htmlFor="ticket-new-chassis">
                        {tForm("newChassis")}
                      </Label>
                      <Input
                        id="ticket-new-chassis"
                        value={customDraft.identificationNumber}
                        disabled={readOnly}
                        onChange={(e) =>
                          setCustomDraft((d) => ({
                            ...d,
                            identificationNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="grid gap-1">
                      <Label htmlFor="ticket-new-qty-sell">
                        {tForm("colQtySell")}
                      </Label>
                      <Input
                        id="ticket-new-qty-sell"
                        type="number"
                        min={0}
                        step={1}
                        value={customDraft.qtySell}
                        disabled={readOnly}
                        onChange={(e) =>
                          setCustomDraft((d) => ({
                            ...d,
                            qtySell: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="ticket-new-qty-reorder">
                        {tForm("colQtyReorder")}
                      </Label>
                      <Input
                        id="ticket-new-qty-reorder"
                        type="number"
                        min={0}
                        step={1}
                        value={customDraft.qtyReorder}
                        disabled={readOnly}
                        onChange={(e) =>
                          setCustomDraft((d) => ({
                            ...d,
                            qtyReorder: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="ticket-new-deposit">
                        {tForm("colDeposit")}
                      </Label>
                      <Input
                        id="ticket-new-deposit"
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={customDraft.deposit}
                        disabled={readOnly}
                        onChange={(e) =>
                          setCustomDraft((d) => ({
                            ...d,
                            deposit: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="ticket-new-note">{tForm("newNote")}</Label>
                    <Textarea
                      id="ticket-new-note"
                      rows={2}
                      value={customDraft.note}
                      disabled={readOnly}
                      onChange={(e) =>
                        setCustomDraft((d) => ({ ...d, note: e.target.value }))
                      }
                    />
                  </div>
                  <ImageUploadField
                    id="ticket-new-images"
                    labelKey="page.orderTicket.form.newImages"
                    purpose="purchase_request_item_image"
                    value={customImages}
                    onChange={setCustomImages}
                    maxFiles={3}
                    uploadTiming="immediate"
                    disabled={readOnly}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={readOnly}
                      onClick={addCustomLine}
                    >
                      <Plus className="text-current" aria-hidden />
                      {tForm("addNewItem")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <TicketLinesPanel
          documentHeading={sku || tForm("sectionRequest")}
          lines={lines}
          note={note}
          grandDepositOverride={grandDepositOverride}
          saving={saving}
          readOnly={readOnly}
          onLineChange={onLineChange}
          onLineRemove={(key) =>
            setLines((prev) => prev.filter((l) => l.key !== key))
          }
          onNoteChange={setNote}
          onGrandDepositOverrideChange={setGrandDepositOverride}
          onCancel={() => router.push("/admin/sales/ticket")}
          onSaveDraft={() => void save("draft")}
          onSubmit={() => void save("pending")}
        />
      </div>
    </div>
  );
}
