"use client";

import { Check, Copy, Eye, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { ImageUploadField } from "@/components/molecules/image-upload-field";
import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { TableIconActions } from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import type { DisplayLocale } from "@/lib/format-datetime";
import type { ListItemBody } from "@/lib/product-list-api";
import type { SettingVatItem } from "@/lib/setting-api";
import {
  fetchSystemFile,
  type ImageUploadItem,
  type ImageUploadItemRemote,
} from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

import { WarehousePlacementCascadeRow } from "./product-list-form-warehouse-placement-row";
import {
  activeVatRate,
  composeItemSku,
  firstSupplierCost,
  formatStockQty,
  generateItemBarcode,
  generateItemQrcode,
  type ItemSalesFieldErrors,
  imageUploadItemsToListItemFiles,
  alternateSkusForSource,
  hasPendingAlternateClone,
  isItemSkuTaken,
  itemSkuSuffix,
  listItemFileIdsKey,
  listSkuPrefix,
  nextVariantSkuSuffix,
  marginPct,
  packUnitKey,
  priceInclVat,
  PRODUCT_ITEM_GALLERY_MAX,
  PRODUCT_ITEM_UNITS,
  sortListItemFiles,
  supplierNetPrice,
} from "./product-list-form-utils";

const TABLE_PAGE = 10;

/** Longest copy: itemGenerateQrcode (th/en) at size lg. */
const VARIANT_SALES_ROW_BTN_CLASS =
  "h-10 w-[8rem] shrink-0 justify-center px-3";

type SaleChannel = { id: number; name: string };

type Props = {
  item: ListItemBody;
  listSku: string;
  allItems: ListItemBody[];
  vat: SettingVatItem | null;
  saleChannels: SaleChannel[];
  onChange: (next: ListItemBody) => void;
  loadSuppliers: (ctx: RemoteComboboxLoadContext) => Promise<
    { value: string; label: string }[]
  >;
  onViewLots: () => void;
  fieldErrors?: ItemSalesFieldErrors;
  onClearFieldError?: (key: keyof ItemSalesFieldErrors) => void;
  canCloneItem: boolean;
  onCloneAlternateSku: (newSuffix: string) => void | Promise<void>;
};

export function ProductListFormVariantSections({
  item,
  listSku,
  allItems,
  vat,
  saleChannels,
  onChange,
  loadSuppliers,
  onViewLots,
  fieldErrors,
  onClearFieldError,
  canCloneItem,
  onCloneAlternateSku,
}: Props) {
  const pendingAlternateClone = hasPendingAlternateClone(allItems);
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tCrud = useTranslations("crud");
  const tFormPh = useTranslations("form");
  const tError = useTranslations("error");

  const vatRate = activeVatRate(vat);
  const skuPrefix = listSkuPrefix(listSku);
  const skuSuffix = itemSkuSuffix(item, listSku);
  const alternateSkus = useMemo(
    () => alternateSkusForSource(item, allItems, listSku),
    [item, allItems, listSku]
  );

  const [channelPage, setChannelPage] = useState(1);
  const [channelEditId, setChannelEditId] = useState<number | null>(null);
  const [channelDraft, setChannelDraft] = useState(0);

  const [supplierEditId, setSupplierEditId] = useState<number | null>(null);
  const [supplierDraft, setSupplierDraft] = useState({
    supplier_user_id: 0,
    cost_price: 0,
    discount: 0,
    discount_type: "baht",
  });

  const [supplyTab, setSupplyTab] = useState<"suppliers" | "warehouse">(
    "suppliers"
  );
  const [stripOpen, setStripOpen] = useState(false);
  const [stripSuffix, setStripSuffix] = useState("");
  const [stripError, setStripError] = useState("");

  const [galleryValue, setGalleryValue] = useState<ImageUploadItem[]>([]);
  const remoteUrlCache = useRef(new Map<number, ImageUploadItemRemote>());
  const fileIdsKey = useMemo(
    () => listItemFileIdsKey(item.files),
    [item.files]
  );

  useEffect(() => {
    let cancelled = false;
    const sorted = sortListItemFiles(item.files).slice(
      0,
      PRODUCT_ITEM_GALLERY_MAX
    );
    if (!sorted.length) {
      setGalleryValue([]);
      return;
    }
    void (async () => {
      const items: ImageUploadItem[] = [];
      for (const f of sorted) {
        const cached = remoteUrlCache.current.get(f.system_file_id);
        if (cached) {
          items.push(cached);
          continue;
        }
        try {
          const remote = await fetchSystemFile(locale, f.system_file_id);
          remoteUrlCache.current.set(remote.id, remote);
          items.push(remote);
        } catch {
          /* skip broken file row */
        }
      }
      if (!cancelled) setGalleryValue(items);
    })();
    return () => {
      cancelled = true;
    };
    // fileIdsKey gates hydrate; order comes from item.files at change time only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-fetch on reorder-only patch
  }, [fileIdsKey, locale]);

  const channelRows = item.channel_prices ?? [];
  const channelTotalPages = Math.max(
    1,
    Math.ceil(channelRows.length / TABLE_PAGE)
  );
  const channelSlice = channelRows.slice(
    (channelPage - 1) * TABLE_PAGE,
    channelPage * TABLE_PAGE
  );

  const refCost = firstSupplierCost(item);

  const patch = (partial: Partial<ListItemBody>) =>
    onChange({ ...item, ...partial });

  const onGalleryChange = (items: ImageUploadItem[]) => {
    setGalleryValue(items);
    for (const it of items) {
      if (it.kind === "remote") {
        remoteUrlCache.current.set(it.id, it);
      }
    }
    patch({ files: imageUploadItemsToListItemFiles(items) });
  };

  const galleryFieldId = `variant-gallery-${item.id ?? item._draftKey ?? "new"}`;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <Section title={tForm("itemSectionImages")} num={1}>
        <ImageUploadField
          id={galleryFieldId}
          labelKey="productListForm.itemUploadImages"
          showLabel={false}
          purpose="product_item_image"
          value={galleryValue}
          onChange={onGalleryChange}
          maxFiles={PRODUCT_ITEM_GALLERY_MAX}
          uploadTiming="immediate"
        />
      </Section>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
        <Section
          title={tForm("itemSectionSales")}
          num={2}
          className="h-full"
        >
          <div className="space-y-3">
            <Field
              className="gap-1.5"
              data-invalid={fieldErrors?.nameTh ? true : undefined}
            >
              <FieldLabel>
                {tForm("itemOfficialNameTh")}
                <span className="text-destructive ml-0.5" aria-hidden="true">
                  *
                </span>
              </FieldLabel>
              <Input
                value={item.names.th}
                aria-invalid={fieldErrors?.nameTh ? true : undefined}
                className={fieldErrors?.nameTh ? "aria-invalid:ring-0" : undefined}
                placeholder={tFormPh("placeholder.input", {
                  label: tForm("itemOfficialNameTh"),
                })}
                onChange={(e) => {
                  onClearFieldError?.("nameTh");
                  patch({ names: { ...item.names, th: e.target.value } });
                }}
              />
            </Field>
            <Field
              className="gap-1.5"
              data-invalid={fieldErrors?.nameEn ? true : undefined}
            >
              <FieldLabel>
                {tForm("itemOfficialNameEn")}
                <span className="text-destructive ml-0.5" aria-hidden="true">
                  *
                </span>
              </FieldLabel>
              <Input
                value={item.names.en}
                aria-invalid={fieldErrors?.nameEn ? true : undefined}
                className={fieldErrors?.nameEn ? "aria-invalid:ring-0" : undefined}
                placeholder={tFormPh("placeholder.input", {
                  label: tForm("itemOfficialNameEn"),
                })}
                onChange={(e) => {
                  onClearFieldError?.("nameEn");
                  patch({ names: { ...item.names, en: e.target.value } });
                }}
              />
            </Field>
            <Field
              className="gap-1.5"
              data-invalid={fieldErrors?.sku ? true : undefined}
            >
              <FieldLabel>
                {tForm("itemProductCode")}
                <span className="text-destructive ml-0.5" aria-hidden="true">
                  *
                </span>
              </FieldLabel>
              <div className="flex flex-wrap items-start gap-2">
                <InputGroup
                  className={cn(
                    "min-w-0 flex-1 rounded-login",
                    fieldErrors?.sku &&
                      "has-[[data-slot][aria-invalid=true]]:ring-0"
                  )}
                >
                  <InputGroupAddon
                    align="inline-start"
                    className="cursor-default"
                  >
                    <span className="tabular-nums opacity-75">
                      {skuPrefix || "—"}
                    </span>
                  </InputGroupAddon>
                  <InputGroupInput
                    value={skuSuffix}
                    aria-invalid={fieldErrors?.sku ? true : undefined}
                    placeholder={tFormPh("placeholder.input", {
                      label: tForm("itemSkuSuffix"),
                    })}
                    onChange={(e) => {
                      onClearFieldError?.("sku");
                      const raw = e.target.value;
                      const itemOnly =
                        itemSkuSuffix({ sku: raw } as ListItemBody, listSku) ||
                        raw.trim();
                      patch({ sku: composeItemSku(listSku, itemOnly) });
                    }}
                  />
                </InputGroup>
                <Button
                  type="button"
                  size="lg"
                  className={VARIANT_SALES_ROW_BTN_CLASS}
                  disabled={
                    !canCloneItem ||
                    !item.id ||
                    stripOpen ||
                    pendingAlternateClone
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    setStripError("");
                    setStripSuffix(
                      nextVariantSkuSuffix(
                        allItems,
                        listSku,
                        item._draftKey
                      )
                    );
                    setStripOpen(true);
                  }}
                >
                  {tForm("itemStripCode")}
                </Button>
              </div>
              {stripOpen ? (
                <div className="flex flex-wrap items-start gap-2 pt-1">
                  <InputGroup
                    className="min-w-0 flex-1 rounded-login"
                    data-invalid={stripError ? true : undefined}
                  >
                    <InputGroupAddon
                      align="inline-start"
                      className="cursor-default"
                    >
                      <span className="tabular-nums opacity-75">
                        {skuPrefix || "—"}
                      </span>
                    </InputGroupAddon>
                    <InputGroupInput
                      value={stripSuffix}
                      aria-invalid={stripError ? true : undefined}
                      placeholder={tFormPh("placeholder.input", {
                        label: tForm("itemSkuSuffix"),
                      })}
                      onChange={(e) => {
                        setStripError("");
                        setStripSuffix(e.target.value);
                      }}
                    />
                  </InputGroup>
                  <ButtonIcon
                    type="button"
                    variant="outline"
                    tone="neutral"
                    aria-label={tCrud("btn.cancel")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStripOpen(false);
                      setStripSuffix("");
                      setStripError("");
                    }}
                  >
                    <X className="text-current" />
                  </ButtonIcon>
                  <ButtonIcon
                    type="button"
                    variant="outline"
                    tone="neutral"
                    aria-label={tForm("itemCopy")}
                    onClick={(e) => {
                      e.stopPropagation();
                      void (async () => {
                        const trimmed = stripSuffix.trim();
                        if (!trimmed) {
                          setStripError(tError("required"));
                          return;
                        }
                        if (
                          isItemSkuTaken(
                            allItems,
                            listSku,
                            trimmed,
                            item._draftKey
                          )
                        ) {
                          setStripError(tForm("errorCloneSkuTaken"));
                          return;
                        }
                        try {
                          await onCloneAlternateSku(trimmed);
                          setStripOpen(false);
                          setStripSuffix("");
                          setStripError("");
                        } catch {
                          /* toast from parent */
                        }
                      })();
                    }}
                  >
                    <Copy className="text-current" />
                  </ButtonIcon>
                </div>
              ) : null}
              {stripError ? (
                <FieldError role="alert">{stripError}</FieldError>
              ) : null}
              {alternateSkus.map((altSku) => (
                <p
                  key={altSku}
                  className="text-sm text-muted-foreground pt-0.5"
                >
                  <span>{tForm("itemAlternateSkuLabel")}</span>{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {altSku}
                  </span>
                </p>
              ))}
            </Field>
            <Field className="gap-1.5">
              <FieldLabel>{tForm("itemBarcode")}</FieldLabel>
              <div className="flex flex-wrap items-start gap-2">
                <Input
                  className="min-w-0 flex-1"
                  value={item.barcode ?? ""}
                  placeholder={tFormPh("placeholder.input", {
                    label: tForm("itemBarcode"),
                  })}
                  onChange={(e) => patch({ barcode: e.target.value })}
                />
                <Button
                  type="button"
                  size="lg"
                  className={VARIANT_SALES_ROW_BTN_CLASS}
                  onClick={(e) => {
                    e.stopPropagation();
                    patch({ barcode: generateItemBarcode() });
                    toast.success(tForm("toastBarcodeGenerated"));
                  }}
                >
                  {tForm("itemCreateBarcode")}
                </Button>
              </div>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel>{tForm("itemQrcode")}</FieldLabel>
              <div className="flex flex-wrap items-start gap-2">
                <Input
                  className="min-w-0 flex-1"
                  value={item.qrcode ?? ""}
                  placeholder={tFormPh("placeholder.input", {
                    label: tForm("itemQrcode"),
                  })}
                  onChange={(e) => patch({ qrcode: e.target.value })}
                />
                <Button
                  type="button"
                  size="lg"
                  className={VARIANT_SALES_ROW_BTN_CLASS}
                  onClick={(e) => {
                    e.stopPropagation();
                    patch({ qrcode: generateItemQrcode() });
                    toast.success(tForm("toastQrcodeGenerated"));
                  }}
                >
                  {tForm("itemGenerateQrcode")}
                </Button>
              </div>
            </Field>
            <StatusSwitchField
              labelKey="productListForm.itemAuthenticSpare"
              checked={item.is_authentic}
              onCheckedChange={(checked) => patch({ is_authentic: checked })}
            />
          </div>
        </Section>
        <div className="flex min-w-0 flex-col gap-3">
          <Section title={tForm("itemSpecs")} num="2.1">
            <div className="space-y-3">
              <Field
                className="gap-1.5"
                data-invalid={fieldErrors?.weight ? true : undefined}
              >
                <FieldLabel>
                  {tForm("itemWeight")}
                  <span className="text-destructive ml-0.5" aria-hidden="true">
                    *
                  </span>
                </FieldLabel>
                <InputGroup
                  className={cn(
                    "rounded-login",
                    fieldErrors?.weight &&
                      "has-[[data-slot][aria-invalid=true]]:ring-0"
                  )}
                >
                  <InputGroupInput
                    type="number"
                    inputMode="decimal"
                    required
                    value={item.weight != null ? String(item.weight) : ""}
                    aria-invalid={fieldErrors?.weight ? true : undefined}
                    placeholder={tFormPh("placeholder.input", {
                      label: tForm("itemWeight"),
                    })}
                    onChange={(e) => {
                      onClearFieldError?.("weight");
                      patch({
                        weight: e.target.value ? Number(e.target.value) : null,
                      });
                    }}
                  />
                  <InputGroupAddon align="inline-end">kg</InputGroupAddon>
                </InputGroup>
              </Field>
              <Field className="gap-1.5">
                <div className="flex flex-wrap items-end gap-x-2 gap-y-2">
                  {(
                    [
                      { key: "width" as const, labelKey: "dimW" as const },
                      { key: "length" as const, labelKey: "dimL" as const },
                      { key: "height" as const, labelKey: "dimH" as const },
                    ] as const
                  ).map((dim, index) => (
                    <Fragment key={dim.key}>
                      {index > 0 ? (
                        <span
                          className="pb-2 text-sm text-muted-foreground"
                          aria-hidden="true"
                        >
                          ×
                        </span>
                      ) : null}
                      <div className="flex min-w-18 flex-1 flex-col gap-1">
                        <InputGroup className="rounded-login">
                          <InputGroupInput
                            type="number"
                            inputMode="decimal"
                            value={
                              item[dim.key] != null
                                ? String(item[dim.key])
                                : ""
                            }
                            placeholder={tFormPh("placeholder.input", {
                              label: tForm(dim.labelKey),
                            })}
                            onChange={(e) =>
                              patch({
                                [dim.key]: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                          />
                          <InputGroupAddon align="inline-end">cm</InputGroupAddon>
                        </InputGroup>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </Field>
              <div className="flex items-end gap-2">
                <Field className="min-w-0 flex-1 gap-1.5">
                  <FieldLabel>{tForm("qtyPerPack")}</FieldLabel>
                  <Input
                    type="number"
                    value={String(item.qty_per_unit)}
                    placeholder={tFormPh("placeholder.input", {
                      label: tForm("qtyPerPack"),
                    })}
                    onChange={(e) =>
                      patch({ qty_per_unit: Number(e.target.value) || 1 })
                    }
                  />
                </Field>
                <span
                  className="shrink-0 pb-2.5 text-muted-foreground"
                  aria-hidden="true"
                >
                  /
                </span>
                <Field className="min-w-0 flex-1 gap-1.5">
                  <FieldLabel>{tForm("itemUnit")}</FieldLabel>
                  <Select
                    value={item.unit}
                    onValueChange={(v) => v && patch({ unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_ITEM_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {tList(packUnitKey(u))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          </Section>
          <Section title={tForm("itemTotalStock")} num="2.2">
            <div className="space-y-3">
              <Field className="gap-1.5">
                <FieldLabel>{tList("colStock")}</FieldLabel>
                <div className="flex flex-wrap items-start gap-2">
                  <Input
                    readOnly
                    value={formatStockQty(item.total_stock ?? 0, locale)}
                    className="min-w-0 flex-1 bg-muted/30"
                  />
                  {item.id ? (
                    <Button
                      type="button"
                      size="lg"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewLots();
                      }}
                    >
                      <Eye className="mr-1 size-4" />
                      {tForm("itemViewStock")}
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>{tForm("itemMinQty")}</FieldLabel>
                <Input
                  type="number"
                  value={String(item.minimum_stock)}
                  onChange={(e) =>
                    patch({ minimum_stock: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>

      <Section title={tForm("itemSectionStorefront")} num={3}>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={`type-price-${item.id ?? "new"}`}
              checked={item.type_price !== "stock"}
              onChange={() => patch({ type_price: "manual" })}
            />
            {tForm("itemPriceManual")}
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={`type-price-${item.id ?? "new"}`}
              checked={item.type_price === "stock"}
              onChange={() => patch({ type_price: "stock" })}
            />
            {tForm("itemPriceStock")}
          </label>
        </div>
        {item.type_price !== "stock" ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <PricePair
              labelEx={tList("colNetPrice")}
              labelIncl={tForm("itemPriceInclVat")}
              exValue={item.price}
              vatRate={vatRate}
              onExChange={(price) => patch({ price })}
            />
            <PricePair
              labelEx={tForm("itemWholesaleExVat")}
              labelIncl={tForm("itemWholesaleInclVat")}
              exValue={item.price_wholesale}
              vatRate={vatRate}
              onExChange={(price_wholesale) => patch({ price_wholesale })}
            />
          </div>
        ) : null}
      </Section>

      <Section title={tForm("itemSectionChannel")} num={4}>
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tForm("itemColChannel")}</TableHead>
                <TableHead className="text-right">{tForm("itemColPriceExVat")}</TableHead>
                <TableHead className="text-right">{tForm("itemColTotal")}</TableHead>
                <TableHead className="text-right">{tForm("itemColMargin")}</TableHead>
                <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelSlice.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    {tForm("itemChannelEmpty")}
                  </TableCell>
                </TableRow>
              ) : (
                channelSlice.map((row) => {
                  const ch = saleChannels.find(
                    (c) => c.id === row.setting_sale_channel_id
                  );
                  const editing = channelEditId === row.setting_sale_channel_id;
                  const ex = editing ? channelDraft : row.price;
                  const incl = priceInclVat(ex, vatRate);
                  return (
                    <TableRow key={row.setting_sale_channel_id}>
                      <TableCell>{ch?.name ?? row.setting_sale_channel_id}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {editing ? (
                          <Input
                            type="number"
                            inputMode="decimal"
                            className="ml-auto max-w-32"
                            value={String(channelDraft)}
                            onChange={(e) =>
                              setChannelDraft(Number(e.target.value) || 0)
                            }
                          />
                        ) : (
                          ex.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {incl.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {marginPct(ex, refCost)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {editing ? (
                          <div className="inline-flex gap-1">
                            <ButtonIcon
                              type="button"
                              variant="outline"
                              tone="neutral"
                              aria-label={tCrud("btn.save")}
                              onClick={() => {
                                const cp = [...(item.channel_prices ?? [])];
                                const idx = cp.findIndex(
                                  (p) =>
                                    p.setting_sale_channel_id ===
                                    row.setting_sale_channel_id
                                );
                                if (idx >= 0) {
                                  cp[idx] = { ...cp[idx]!, price: channelDraft };
                                }
                                patch({ channel_prices: cp });
                                setChannelEditId(null);
                              }}
                            >
                              <Check className="text-current" />
                            </ButtonIcon>
                            <ButtonIcon
                              type="button"
                              variant="outline"
                              tone="neutral"
                              aria-label={tCrud("btn.cancel")}
                              onClick={() => setChannelEditId(null)}
                            >
                              <X className="text-current" />
                            </ButtonIcon>
                          </div>
                        ) : (
                          <TableIconActions
                            actions={["edit"]}
                            onAction={() => {
                              setChannelEditId(row.setting_sale_channel_id);
                              setChannelDraft(row.price);
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {channelRows.length > TABLE_PAGE ? (
          <CrudPaginationBar
            page={channelPage}
            pageSize={10}
            meta={{ total: channelRows.length, totalPages: channelTotalPages }}
            onPageChange={setChannelPage}
            onPageSizeChange={() => {}}
          />
        ) : null}
        <Field className="mt-3 gap-1.5">
          <FieldLabel>{tForm("itemPromotion")}</FieldLabel>
          <Textarea
            rows={3}
            value={item.promotion ?? ""}
            placeholder={tFormPh("placeholder.input", {
              label: tForm("itemPromotion"),
            })}
            onChange={(e) => patch({ promotion: e.target.value })}
          />
        </Field>
      </Section>

      <Section title={tForm("itemSectionSupply")} num={5}>
        <Tabs
          value={supplyTab}
          onValueChange={(v) => setSupplyTab(v as "suppliers" | "warehouse")}
        >
          <TabsList variant="line">
            <TabsTrigger value="suppliers">{tForm("itemTabSupplierInfo")}</TabsTrigger>
            <TabsTrigger value="warehouse">{tForm("itemTabWarehouse")}</TabsTrigger>
          </TabsList>
          <TabsContent value="suppliers" className="mt-3 space-y-3">
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tForm("itemColSupplier")}</TableHead>
                    <TableHead className="text-right">{tForm("itemColCost")}</TableHead>
                    <TableHead className="text-right">{tForm("itemColDiscount")}</TableHead>
                    <TableHead className="text-center">
                      {tForm("itemColDiscountType")}
                    </TableHead>
                    <TableHead className="text-right">{tForm("itemColNetCost")}</TableHead>
                    <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(item.suppliers ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-center">
                        {tForm("itemSupplierEmpty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (item.suppliers ?? []).map((row, si) => {
                      const rowKey =
                        row.supplier_user_id > 0
                          ? row.supplier_user_id
                          : -(si + 1);
                      const editing = supplierEditId === rowKey;
                      const draft = editing ? supplierDraft : row;
                      return (
                        <TableRow key={row.supplier_user_id}>
                          <TableCell>
                            {editing ? (
                              <RemoteComboboxField
                                label=""
                                value={
                                  draft.supplier_user_id
                                    ? String(draft.supplier_user_id)
                                    : ""
                                }
                                onValueChange={(v) =>
                                  setSupplierDraft((d) => ({
                                    ...d,
                                    supplier_user_id: Number(v) || 0,
                                  }))
                                }
                                placeholder={tFormPh("placeholder.select", {
                                  label: tForm("itemColSupplier"),
                                })}
                                emptyLabel={tError("noData")}
                                onLoadOptions={loadSuppliers}
                                inputClassName="min-w-[12rem]"
                              />
                            ) : (
                              row.supplier_user_id
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {editing ? (
                              <Input
                                type="number"
                                className="ml-auto max-w-32"
                                value={String(draft.cost_price)}
                                onChange={(e) =>
                                  setSupplierDraft((d) => ({
                                    ...d,
                                    cost_price: Number(e.target.value) || 0,
                                  }))
                                }
                              />
                            ) : (
                              row.cost_price
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {editing ? (
                              <Input
                                type="number"
                                className="ml-auto max-w-32"
                                value={String(draft.discount)}
                                onChange={(e) =>
                                  setSupplierDraft((d) => ({
                                    ...d,
                                    discount: Number(e.target.value) || 0,
                                  }))
                                }
                              />
                            ) : (
                              row.discount
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {editing ? (
                              <Select
                                value={draft.discount_type}
                                onValueChange={(v) =>
                                  v &&
                                  setSupplierDraft((d) => ({
                                    ...d,
                                    discount_type: v,
                                  }))
                                }
                              >
                                <SelectTrigger className="mx-auto max-w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="baht">
                                    {tForm("discountBaht")}
                                  </SelectItem>
                                  <SelectItem value="percent">
                                    {tForm("discountPercent")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : row.discount_type === "percent" ? (
                              tForm("discountPercent")
                            ) : (
                              tForm("discountBaht")
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {supplierNetPrice(draft).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {editing ? (
                              <div className="inline-flex gap-1">
                                <ButtonIcon
                                  type="button"
                                  variant="outline"
                                  tone="neutral"
                                  aria-label={tCrud("btn.save")}
                                  onClick={() => {
                                    const list = [...(item.suppliers ?? [])];
                                    const idx = list.findIndex((_, i) => {
                                      const k =
                                        list[i]!.supplier_user_id > 0
                                          ? list[i]!.supplier_user_id
                                          : -(i + 1);
                                      return k === rowKey;
                                    });
                                    if (idx >= 0) {
                                      list[idx] = { ...supplierDraft };
                                    }
                                    patch({ suppliers: list });
                                    setSupplierEditId(null);
                                  }}
                                >
                                  <Check className="text-current" />
                                </ButtonIcon>
                                <ButtonIcon
                                  type="button"
                                  variant="outline"
                                  tone="neutral"
                                  aria-label={tCrud("btn.cancel")}
                                  onClick={() => setSupplierEditId(null)}
                                >
                                  <X className="text-current" />
                                </ButtonIcon>
                              </div>
                            ) : (
                              <TableIconActions
                                actions={["edit", "delete"]}
                                onAction={(a) => {
                                  if (a === "edit") {
                                    setSupplierEditId(rowKey);
                                    setSupplierDraft({ ...row });
                                  } else {
                                    patch({
                                      suppliers: (item.suppliers ?? []).filter(
                                        (_, i) => {
                                          const k =
                                            item.suppliers![i]!.supplier_user_id >
                                            0
                                              ? item.suppliers![i]!
                                                  .supplier_user_id
                                              : -(i + 1);
                                          return k !== rowKey;
                                        }
                                      ),
                                    });
                                  }
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={supplierEditId != null}
              onClick={() => {
                const list = [...(item.suppliers ?? [])];
                list.push({
                  supplier_user_id: 0,
                  cost_price: 0,
                  discount: 0,
                  discount_type: "baht",
                });
                patch({ suppliers: list });
                setSupplierEditId(-(list.length));
                setSupplierDraft({
                  supplier_user_id: 0,
                  cost_price: 0,
                  discount: 0,
                  discount_type: "baht",
                });
              }}
            >
              {tForm("itemAddSupplier")}
            </Button>
          </TabsContent>
          <TabsContent value="warehouse" className="mt-3 space-y-3">
            <p className="text-muted-foreground text-sm">{tForm("itemWarehouseHint")}</p>
            {(item.warehouse_placements ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">{tForm("itemWarehouseEmpty")}</p>
            ) : (
              (item.warehouse_placements ?? []).map((wp, wi) => (
                <div
                  key={wp.id ?? `wh-${wi}`}
                  className="flex flex-col gap-2 rounded-md border border-border p-3"
                >
                  <WarehousePlacementCascadeRow
                    key={wp.id ?? `wh-row-${wi}-${wp.bin_id}`}
                    binId={wp.bin_id}
                    onBinChange={(bin_id) => {
                      const list = [...(item.warehouse_placements ?? [])];
                      list[wi] = { ...list[wi]!, bin_id };
                      patch({ warehouse_placements: list });
                    }}
                  />
                  <div className="flex justify-end">
                    <ButtonIcon
                      type="button"
                      variant="outline"
                      tone="delete"
                      aria-label={tCrud("btn.delete")}
                      onClick={() =>
                        patch({
                          warehouse_placements: (
                            item.warehouse_placements ?? []
                          ).filter((_, i) => i !== wi),
                        })
                      }
                    >
                      <X className="text-current" />
                    </ButtonIcon>
                  </div>
                </div>
              ))
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                patch({
                  warehouse_placements: [
                    ...(item.warehouse_placements ?? []),
                    { bin_id: 0 },
                  ],
                })
              }
            >
              {tForm("itemAddWarehouse")}
            </Button>
          </TabsContent>
        </Tabs>
      </Section>
    </div>
  );
}

function Section({
  num,
  title,
  children,
  className,
}: {
  num: number | string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const badgeClass =
    typeof num === "string"
      ? "bg-primary/10 text-primary flex min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold"
      : "bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-xs font-semibold";

  return (
    <FormCard className={className}>
      <FormCardHeader>
        <FormCardTitle className="flex items-center gap-2 text-base">
          <span className={badgeClass}>{num}</span>
          {title}
        </FormCardTitle>
      </FormCardHeader>
      <FormCardContent>{children}</FormCardContent>
    </FormCard>
  );
}

function PricePair({
  labelEx,
  labelIncl,
  exValue,
  vatRate,
  onExChange,
}: {
  labelEx: string;
  labelIncl: string;
  exValue: number;
  vatRate: number;
  onExChange: (v: number) => void;
}) {
  const incl = priceInclVat(exValue, vatRate);
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <Field className="gap-1.5">
        <FieldLabel>{labelEx}</FieldLabel>
        <Input
          type="number"
          inputMode="decimal"
          value={String(exValue)}
          onChange={(e) => onExChange(Number(e.target.value) || 0)}
        />
      </Field>
      <Field className="gap-1.5">
        <FieldLabel>{labelIncl}</FieldLabel>
        <Input readOnly value={incl.toFixed(2)} className="bg-muted/30" />
      </Field>
    </div>
  );
}

