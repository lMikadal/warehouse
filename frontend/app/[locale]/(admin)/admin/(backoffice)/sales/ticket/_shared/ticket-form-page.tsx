"use client";

// ponytail: browse column forked from quotation-form-page; ticket lines replace the priced cart.

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchOrderSalesFormItemsByIds,
  fetchOrderSalesFormMember,
  loadOrderSalesMemberComboboxOptions,
  resolveOrderSalesCarBrandLabel,
  resolveOrderSalesCarEngineLabel,
  resolveOrderSalesCarModelLabel,
} from "@/lib/order-sales-form-api";
import {
  createTicket,
  fetchTicketDetail,
  fetchTicketFilters,
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
  TicketCustomStagePanel,
  type CustomDraft,
  type StagedCustom,
} from "./ticket-custom-stage-panel";
import { TicketFormDesktopSplitSkeleton } from "./ticket-form-desktop-split-skeleton";
import {
  TicketLinesPanel,
  type TicketFormLine,
  type TicketPaymentOption,
  type TicketUnit,
} from "./ticket-lines-panel";

const TicketFormDesktopSplit = dynamic(
  () =>
    import("./ticket-form-desktop-split").then((m) => m.TicketFormDesktopSplit),
  { ssr: false, loading: () => <TicketFormDesktopSplitSkeleton /> },
);

const TICKET_RESOURCE = "tickets" as const;
const stepBadgeClass =
  "bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold";

const EMPTY_CUSTOM_DRAFT: CustomDraft = {
  name: "",
  brandId: "",
  modelId: "",
  engineId: "",
  identificationNumber: "",
  note: "",
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

function remoteImageIds(images: ImageUploadItem[]): number[] {
  return images
    .filter(
      (i): i is Extract<ImageUploadItem, { kind: "remote" }> =>
        i.kind === "remote",
    )
    .map((i) => i.id);
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
  const [paymentOptions, setPaymentOptions] = useState<TicketPaymentOption[]>(
    [],
  );
  const [memberId, setMemberId] = useState("");
  const [memberLabel, setMemberLabel] = useState("");
  const [customerSku, setCustomerSku] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerTel, setCustomerTel] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [dateReceive, setDateReceive] = useState("");
  const [lines, setLines] = useState<TicketFormLine[]>([]);
  const [linesTab, setLinesTab] = useState<"catalog" | "custom">("catalog");
  const [note, setNote] = useState("");
  const [grandDepositOverride, setGrandDepositOverride] = useState<
    string | null
  >(null);

  const [tab, setTab] = useState<"catalog" | "custom">("catalog");
  const [customDraft, setCustomDraft] =
    useState<CustomDraft>(EMPTY_CUSTOM_DRAFT);
  const [customImages, setCustomImages] = useState<ImageUploadItem[]>([]);
  const [stagedCustoms, setStagedCustoms] = useState<StagedCustom[]>([]);
  const [selectedStageKeys, setSelectedStageKeys] = useState<string[]>([]);
  const [activeStageKey, setActiveStageKey] = useState<string | null>(null);
  const [editingStageKey, setEditingStageKey] = useState<string | null>(null);

  const readOnly = !!editId && status !== "draft";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // ponytail: sale payment methods are a small catalog (≤ MaxLimit 100).
        const res = await fetchTicketFilters({
          facet: "payment_methods",
          page: 1,
          limit: 100,
          extra: { is_sale: "true" },
        });
        if (cancelled) return;
        const opts = res.items.map((row) => ({
          value: String(row.id),
          label: row.name,
        }));
        setPaymentOptions(opts);
        setPaymentMethodId((prev) => prev || opts[0]?.value || "");
      } catch {
        /* leave empty — section hides when no options */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDetail = useCallback(async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const d = await fetchTicketDetail(editId);
      setStatus(d.status);
      setSku(d.sku ?? "");
      setChannelId(
        d.setting_sale_channel_id ? String(d.setting_sale_channel_id) : "",
      );
      if (d.setting_payment_method_id) {
        setPaymentMethodId(String(d.setting_payment_method_id));
      }
      setNote(d.note ?? "");
      if (d.customer) {
        setMemberId(
          d.customer.member_user_id ? String(d.customer.member_user_id) : "",
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
            catalogIds,
          );
          stockById = Object.fromEntries(
            rows.map((r) => [r.id, r.available_stock ?? r.total_stock ?? 0]),
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
        })),
      );
      const hasCustom = d.items.some((it) => it.type === "custom");
      setLinesTab(hasCustom && !d.items.some((it) => it.type === "catalog")
        ? "custom"
        : "catalog");
      const auto = d.total_deposit_old + d.total_deposit_new;
      setGrandDepositOverride(
        Math.abs(auto - d.total_deposit) > 0.0001
          ? String(d.total_deposit)
          : null,
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
        Number(nextId),
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
        (l) => l.type === "catalog" && l.productItemId === row.id,
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
            : l,
        );
      }
      return [...prev, lineFromBrowseRow(row)];
    });
    setLinesTab("catalog");
  }, []);

  const resolveDraftLabels = async (draft: CustomDraft) => {
    const [brandLabel, modelLabel, engineLabel] = await Promise.all([
      draft.brandId
        ? resolveOrderSalesCarBrandLabel(
            displayLocale,
            TICKET_RESOURCE,
            Number(draft.brandId),
          )
        : Promise.resolve(""),
      draft.modelId
        ? resolveOrderSalesCarModelLabel(
            displayLocale,
            TICKET_RESOURCE,
            Number(draft.modelId),
          )
        : Promise.resolve(""),
      draft.engineId
        ? resolveOrderSalesCarEngineLabel(
            displayLocale,
            TICKET_RESOURCE,
            Number(draft.engineId),
          )
        : Promise.resolve(""),
    ]);
    return { brandLabel, modelLabel, engineLabel };
  };

  const onStageAdd = async () => {
    if (!customDraft.name.trim()) {
      toast.error(tError("required"));
      return;
    }
    const labels = await resolveDraftLabels(customDraft);
    const fileIds = remoteImageIds(customImages);
    if (editingStageKey) {
      setStagedCustoms((prev) =>
        prev.map((row) =>
          row.key === editingStageKey
            ? {
                ...row,
                name: customDraft.name.trim(),
                brandId: customDraft.brandId,
                brandLabel: labels.brandLabel,
                modelId: customDraft.modelId,
                modelLabel: labels.modelLabel,
                engineId: customDraft.engineId,
                engineLabel: labels.engineLabel,
                identificationNumber: customDraft.identificationNumber.trim(),
                note: customDraft.note.trim(),
                systemFileIds: fileIds,
                images: customImages,
              }
            : row,
        ),
      );
      setActiveStageKey(editingStageKey);
      setEditingStageKey(null);
    } else {
      const key = `stage-${Date.now()}-${stagedCustoms.length}`;
      setStagedCustoms((prev) => [
        ...prev,
        {
          key,
          name: customDraft.name.trim(),
          brandId: customDraft.brandId,
          brandLabel: labels.brandLabel,
          modelId: customDraft.modelId,
          modelLabel: labels.modelLabel,
          engineId: customDraft.engineId,
          engineLabel: labels.engineLabel,
          identificationNumber: customDraft.identificationNumber.trim(),
          note: customDraft.note.trim(),
          systemFileIds: fileIds,
          images: customImages,
        },
      ]);
      setActiveStageKey(key);
    }
    setCustomDraft(EMPTY_CUSTOM_DRAFT);
    setCustomImages([]);
  };

  const onStageEdit = (key: string) => {
    const row = stagedCustoms.find((r) => r.key === key);
    if (!row) return;
    setEditingStageKey(key);
    setActiveStageKey(key);
    setCustomDraft({
      name: row.name,
      brandId: row.brandId,
      modelId: row.modelId,
      engineId: row.engineId,
      identificationNumber: row.identificationNumber,
      note: row.note,
    });
    setCustomImages(row.images);
  };

  const pushStagedToLines = useCallback(
    (keys: string[]) => {
      if (keys.length === 0) {
        toast.error(tForm("validationSelectStage"));
        return;
      }
      const rows = stagedCustoms.filter((r) => keys.includes(r.key));
      if (rows.length === 0) {
        toast.error(tForm("validationSelectStage"));
        return;
      }
      let skipped = 0;
      setLines((prev) => {
        const next = [...prev];
        for (const row of rows) {
          if (next.some((l) => l.stagedKey === row.key)) {
            skipped += 1;
            continue;
          }
          next.push({
            key: `custom-${row.key}`,
            stagedKey: row.key,
            type: "custom",
            productName: row.name,
            productSku: "",
            brandName: row.brandLabel,
            stockQty: 0,
            brandId: row.brandId,
            modelId: row.modelId,
            engineId: row.engineId,
            identificationNumber: row.identificationNumber,
            note: row.note,
            systemFileIds: row.systemFileIds,
            qtySell: DEFAULT_QTY_SELL,
            qtyReorder: 0,
            unit: "piece",
            deposit: "",
          });
        }
        return next;
      });
      if (skipped > 0) {
        toast.error(tForm("alreadyInCart"));
      }
      setLinesTab("custom");
      setActiveStageKey(keys[keys.length - 1] ?? null);
    },
    [stagedCustoms, tForm],
  );

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
      }),
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

  const validate = (nextStatus: Extract<TicketStatus, "draft" | "pending">): boolean => {
    if (!customerName.trim() || !customerTel.trim()) {
      toast.error(tForm("validationCustomer"));
      return false;
    }
    if (
      customerEmail.trim() &&
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)
    ) {
      toast.error(tForm("validationEmail"));
      return false;
    }
    if (lines.length === 0) {
      toast.error(tForm("validationNoItems"));
      return false;
    }
    if (
      nextStatus === "pending" &&
      paymentOptions.length > 0 &&
      !paymentMethodId
    ) {
      toast.error(tForm("validationPayment"));
      return false;
    }
    return true;
  };

  const save = async (
    nextStatus: Extract<TicketStatus, "draft" | "pending">,
  ) => {
    if (!validate(nextStatus)) return;
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
        e instanceof OrderTicketApiError ? e.message : tError("saveFailed"),
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
        <TicketFormDesktopSplitSkeleton />
      </div>
    );
  }

  const mainColumn = (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className={stepBadgeClass}>1</span>
            {tForm("sectionCustomer")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 overflow-visible">
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
                placeholder={tFormRoot("placeholder.input", {
                  label: tForm("customerName"),
                })}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="ticket-customer-tel">{tForm("customerTel")}</Label>
              <Input
                id="ticket-customer-tel"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={customerTel}
                disabled={readOnly}
                placeholder={tFormRoot("placeholder.input", {
                  label: tForm("customerTel"),
                })}
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
                placeholder={tFormRoot("placeholder.input", {
                  label: tForm("customerEmail"),
                })}
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
          <div className="flex w-full items-center justify-between gap-2 border-b border-border">
            <div className="flex items-center gap-2">
              {(["catalog", "custom"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "-mb-px border-b-2 px-1 py-2.5 text-sm font-medium",
                    tab === key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => setTab(key)}
                >
                  {key === "catalog" ? tForm("tabExisting") : tForm("tabNew")}
                </button>
              ))}
            </div>
            {tab === "custom" ? (
              <Button
                type="button"
                size="sm"
                className="mb-1 shrink-0"
                disabled={readOnly || stagedCustoms.length === 0}
                onClick={() => {
                  if (selectedStageKeys.length > 0) {
                    pushStagedToLines(selectedStageKeys);
                    return;
                  }
                  if (activeStageKey) {
                    pushStagedToLines([activeStageKey]);
                    return;
                  }
                  toast.error(tForm("validationSelectStage"));
                }}
              >
                {tForm("selectItems")}
              </Button>
            ) : null}
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
            <TicketCustomStagePanel
              resource={TICKET_RESOURCE}
              displayLocale={displayLocale}
              readOnly={readOnly}
              draft={customDraft}
              images={customImages}
              staged={stagedCustoms}
              selectedKeys={selectedStageKeys}
              activeKey={activeStageKey}
              editingKey={editingStageKey}
              onDraftChange={(patch) =>
                setCustomDraft((d) => ({ ...d, ...patch }))
              }
              onImagesChange={setCustomImages}
              onToggleSelect={(key) =>
                setSelectedStageKeys((prev) =>
                  prev.includes(key)
                    ? prev.filter((k) => k !== key)
                    : [...prev, key],
                )
              }
              onSelectAll={(checked) =>
                setSelectedStageKeys(
                  checked ? stagedCustoms.map((r) => r.key) : [],
                )
              }
              onStageAdd={() => void onStageAdd()}
              onStageEdit={onStageEdit}
              onStageRemove={(key) => {
                setStagedCustoms((prev) => prev.filter((r) => r.key !== key));
                setSelectedStageKeys((prev) => prev.filter((k) => k !== key));
                if (activeStageKey === key) setActiveStageKey(null);
                if (editingStageKey === key) {
                  setEditingStageKey(null);
                  setCustomDraft(EMPTY_CUSTOM_DRAFT);
                  setCustomImages([]);
                }
              }}
              onClearAll={() => {
                setStagedCustoms([]);
                setSelectedStageKeys([]);
                setActiveStageKey(null);
                setEditingStageKey(null);
                setCustomDraft(EMPTY_CUSTOM_DRAFT);
                setCustomImages([]);
              }}
              onRowActivate={(key) => pushStagedToLines([key])}
            />
          )}
        </CardContent>
      </Card>
    </>
  );

  const sidebarColumn = (
    <TicketLinesPanel
      documentHeading={sku || tForm("sectionRequest")}
      lines={lines}
      linesTab={linesTab}
      onLinesTabChange={setLinesTab}
      grandDepositOverride={grandDepositOverride}
      paymentMethodId={paymentMethodId}
      paymentOptions={paymentOptions}
      onPaymentMethodChange={setPaymentMethodId}
      saving={saving}
      readOnly={readOnly}
      onLineChange={onLineChange}
      onLineRemove={(key) =>
        setLines((prev) => prev.filter((l) => l.key !== key))
      }
      onGrandDepositOverrideChange={setGrandDepositOverride}
      onCancel={() => router.push("/admin/sales/ticket")}
      onSaveDraft={() => void save("draft")}
      onSubmit={() => void save("pending")}
    />
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-20">
      <CrudPageHeader
        title={editId ? tForm("titleEdit") : tForm("titleCreate")}
        description={sku || tPage("subtitle")}
      />

      <div className="flex flex-col gap-4 md:hidden">
        <div className="flex min-w-0 flex-col gap-4">{mainColumn}</div>
        <div className="flex min-w-0 flex-col gap-4">{sidebarColumn}</div>
      </div>
      <div className="hidden min-w-0 w-full md:block">
        <TicketFormDesktopSplit main={mainColumn} sidebar={sidebarColumn} />
      </div>
    </div>
  );
}
