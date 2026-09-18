"use client";

import { Copy, Eye, ImageIcon, Plus, X } from "lucide-react";
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
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { TableIconActions } from "@/components/molecules/table-icon-actions";
import { Spinner } from "@/components/ui/spinner";
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
import { fetchProductListFilters } from "@/lib/product-filters-api";
import {
  fetchAllProductItemStocks,
  fetchProductItemStocks,
  fetchProductItemWarehousePlacements,
  type ListItemBody,
  type ProductItemStockRow,
  type WarehousePlacementRow,
} from "@/lib/product-list-api";
import type { SettingVatItem } from "@/lib/setting-api";
import {
  fetchSystemFile,
  type ImageUploadItem,
  type ImageUploadItemRemote,
} from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

import { remainQtyForWarehousePlacement } from "./product-list-form-lot-utils";
import { WarehousePlacementCascadeRow } from "./product-list-form-warehouse-placement-row";
import {
  activeVatRate,
  channelMarginDisplay,
  channelRowExIncl,
  composeItemSku,
  sortChannelPriceRows,
  type SaleChannelMeta,
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
  packUnitKey,
  priceExFromIncl,
  priceInclVat,
  PRODUCT_ITEM_GALLERY_MAX,
  PRODUCT_ITEM_UNITS,
  sortListItemFiles,
  supplierNetPrice,
} from "./product-list-form-utils";

const TABLE_PAGE = 10;

function SaleChannelLogoPlaceholder() {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30"
      aria-hidden
    >
      <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
    </div>
  );
}

function SaleChannelLogoThumbLoaded({
  fileId,
  locale,
}: {
  fileId: number;
  locale: string;
}) {
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
      <div
        className="flex size-10 shrink-0 items-center justify-center"
        aria-hidden
      >
        <Spinner className="size-5" />
      </div>
    );
  }
  if (failed || !url) {
    return <SaleChannelLogoPlaceholder />;
  }

  return (
    <div
      className="size-10 shrink-0 overflow-hidden rounded-md border border-border"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-full object-cover" />
    </div>
  );
}

function SaleChannelLogoThumb({
  fileId,
  locale,
}: {
  fileId?: number;
  locale: string;
}) {
  if (fileId == null || fileId <= 0) {
    return <SaleChannelLogoPlaceholder />;
  }
  return (
    <SaleChannelLogoThumbLoaded key={fileId} fileId={fileId} locale={locale} />
  );
}

/** Longest copy: itemGenerateQrcode (th/en) at size lg. */
const VARIANT_SALES_ROW_BTN_CLASS =
  "h-10 w-[8rem] shrink-0 justify-center px-3";

type Props = {
  item: ListItemBody;
  listSku: string;
  allItems: ListItemBody[];
  vat: SettingVatItem | null;
  saleChannels: SaleChannelMeta[];
  onChange: (next: ListItemBody) => void;
  loadSuppliers: (ctx: RemoteComboboxLoadContext) => Promise<
    { value: string; label: string }[]
  >;
  onViewLots: () => void;
  fieldErrors?: ItemSalesFieldErrors;
  onClearFieldError?: (key: keyof ItemSalesFieldErrors) => void;
  canCloneItem: boolean;
  onCloneAlternateSku: (newSuffix: string) => void | Promise<void>;
  /** Bump when lot stock changes so channel margin refetches used lot cost. */
  stocksRefreshKey?: number;
  listSupplierIds: number[];
};

export function ProductListFormVariantSections({
  item,
  listSku,
  allItems,
  vat,
  saleChannels,
  onChange,
  loadSuppliers: _loadSuppliers,
  onViewLots,
  fieldErrors,
  onClearFieldError,
  canCloneItem,
  onCloneAlternateSku,
  stocksRefreshKey = 0,
  listSupplierIds,
}: Props) {
  const pendingAlternateClone = hasPendingAlternateClone(allItems);
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tCrud = useTranslations("crud");
  const tFormPh = useTranslations("form");
  const tError = useTranslations("error");

  const vatRate = activeVatRate(vat);
  const vatType = vat?.vat_type === "include" ? "include" : "exclude";
  const skuPrefix = listSkuPrefix(listSku);
  const skuSuffix = itemSkuSuffix(item, listSku);
  const alternateSkus = useMemo(
    () => alternateSkusForSource(item, allItems, listSku),
    [item, allItems, listSku]
  );

  const [channelPage, setChannelPage] = useState(1);
  const [usedLotCostPerUnit, setUsedLotCostPerUnit] = useState<number | null>(
    null
  );
  const [warehousePlacementMeta, setWarehousePlacementMeta] = useState<
    WarehousePlacementRow[]
  >([]);
  const [stockRows, setStockRows] = useState<ProductItemStockRow[]>([]);

  const [listPartnerLabelById, setListPartnerLabelById] = useState<
    Map<number, string>
  >(new Map());

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

  const sortedChannelRows = useMemo(
    () => sortChannelPriceRows(item.channel_prices ?? [], saleChannels),
    [item.channel_prices, saleChannels]
  );
  const channelTotalPages = Math.max(
    1,
    Math.ceil(sortedChannelRows.length / TABLE_PAGE)
  );
  const channelSlice = sortedChannelRows.slice(
    (channelPage - 1) * TABLE_PAGE,
    channelPage * TABLE_PAGE
  );

  const usedChannelIds = useMemo(
    () =>
      new Set(
        (item.channel_prices ?? []).map((p) => p.setting_sale_channel_id)
      ),
    [item.channel_prices]
  );

  const listPartnerIds = useMemo(
    () => listSupplierIds.filter((id) => id > 0),
    [listSupplierIds]
  );

  const hasListPartnerLeftToAdd = useMemo(() => {
    const used = new Set(
      (item.suppliers ?? [])
        .map((s) => s.supplier_user_id)
        .filter((id) => id > 0)
    );
    return listPartnerIds.some((id) => !used.has(id));
  }, [item.suppliers, listPartnerIds]);

  useEffect(() => {
    if (listPartnerIds.length === 0) {
      setListPartnerLabelById(new Map());
      return;
    }
    let cancelled = false;
    void fetchProductListFilters(locale, "suppliers", {
      page: 1,
      limit: 100,
    })
      .then((res) => {
        if (cancelled) return;
        const allowed = new Set(listPartnerIds);
        const map = new Map<number, string>();
        for (const row of res.items) {
          if (allowed.has(row.id)) {
            map.set(row.id, row.name);
          }
        }
        setListPartnerLabelById(map);
      })
      .catch(() => {
        if (!cancelled) setListPartnerLabelById(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [listPartnerIds, locale]);

  const supplierSelectOptionsForRow = (currentSupplierId: number) => {
    const used = new Set(
      (item.suppliers ?? [])
        .map((s) => s.supplier_user_id)
        .filter((id) => id > 0 && id !== currentSupplierId)
    );
    return listPartnerIds
      .filter((id) => !used.has(id))
      .map((id) => ({
        id,
        name: listPartnerLabelById.get(id) ?? String(id),
      }));
  };

  useEffect(() => {
    if (!item.id) {
      setUsedLotCostPerUnit(null);
      return;
    }
    let cancelled = false;
    void fetchProductItemStocks(locale, item.id, { page: 1, limit: 50 })
      .then((res) => {
        const used = res.items.find((s) => s.is_used);
        if (!cancelled) {
          setUsedLotCostPerUnit(
            used != null ? used.cost_per_unit : null
          );
        }
      })
      .catch(() => {
        if (!cancelled) setUsedLotCostPerUnit(null);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, locale, stocksRefreshKey]);

  useEffect(() => {
    if (!item.id) {
      setWarehousePlacementMeta([]);
      setStockRows([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      fetchProductItemWarehousePlacements(locale, item.id),
      fetchAllProductItemStocks(locale, item.id),
    ])
      .then(([placements, stocks]) => {
        if (!cancelled) {
          setWarehousePlacementMeta(placements);
          setStockRows(stocks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWarehousePlacementMeta([]);
          setStockRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, locale, stocksRefreshKey]);

  const patch = (partial: Partial<ListItemBody>) =>
    onChange({ ...item, ...partial });

  const updateChannelRow = (
    channelId: number,
    rowPatch: Partial<NonNullable<ListItemBody["channel_prices"]>[number]>
  ) => {
    const cp = [...(item.channel_prices ?? [])];
    const idx = cp.findIndex((p) => p.setting_sale_channel_id === channelId);
    if (idx < 0) return;
    cp[idx] = { ...cp[idx]!, ...rowPatch };
    patch({ channel_prices: sortChannelPriceRows(cp, saleChannels) });
  };

  const updateSupplierRow = (
    rowIndex: number,
    rowPatch: Partial<NonNullable<ListItemBody["suppliers"]>[number]>
  ) => {
    const list = [...(item.suppliers ?? [])];
    if (rowIndex < 0 || rowIndex >= list.length) return;
    const nextId =
      rowPatch.supplier_user_id ?? list[rowIndex]!.supplier_user_id;
    if (
      nextId > 0 &&
      list.some((r, i) => i !== rowIndex && r.supplier_user_id === nextId)
    ) {
      toast.error(tForm("itemSupplierDuplicate"));
      return;
    }
    list[rowIndex] = { ...list[rowIndex]!, ...rowPatch };
    patch({ suppliers: list });
  };

  const setChannelId = (oldId: number, newId: number) => {
    if (oldId === newId || newId <= 0) return;
    if (usedChannelIds.has(newId)) {
      toast.error(tForm("itemChannelDuplicate"));
      return;
    }
    const cp = [...(item.channel_prices ?? [])];
    const idx = cp.findIndex((p) => p.setting_sale_channel_id === oldId);
    if (idx < 0) return;
    cp[idx] = { ...cp[idx]!, setting_sale_channel_id: newId };
    patch({ channel_prices: sortChannelPriceRows(cp, saleChannels) });
  };

  const removeChannelRow = (channelId: number) => {
    const isDefault = saleChannels.some(
      (c) => c.is_default && c.id === channelId
    );
    const removed = [...(item._removed_channel_ids ?? [])];
    if (isDefault && channelId > 0 && !removed.includes(channelId)) {
      removed.push(channelId);
    }
    patch({
      channel_prices: (item.channel_prices ?? []).filter(
        (p) => p.setting_sale_channel_id !== channelId
      ),
      _removed_channel_ids: removed,
    });
  };

  const addChannelRow = () => {
    const used = new Set(
      (item.channel_prices ?? []).map((p) => p.setting_sale_channel_id)
    );
    const next = saleChannels.find((c) => !used.has(c.id));
    if (!next) {
      toast.info(tForm("itemChannelAllAdded"));
      return;
    }
    patch({
      channel_prices: sortChannelPriceRows(
        [
          ...(item.channel_prices ?? []),
          { setting_sale_channel_id: next.id, price: 0, price_vat: 0 },
        ],
        saleChannels
      ),
    });
  };

  const channelOptionsForRow = (currentId: number) =>
    saleChannels.filter(
      (c) => c.id === currentId || !usedChannelIds.has(c.id)
    );

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
                    pendingAlternateClone ||
                    alternateSkus.length > 0
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
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <PricePair
              labelEx={tList("colNetPrice")}
              labelIncl={tForm("itemPriceInclVat")}
              vatType={vatType}
              exValue={item.price}
              inclValue={
                item.price_vat > 0
                  ? item.price_vat
                  : priceInclVat(item.price, vatRate)
              }
              vatRate={vatRate}
              onExChange={(price) =>
                patch({
                  price,
                  price_vat: priceInclVat(price, vatRate),
                })
              }
              onInclChange={(price_vat) =>
                patch({
                  price_vat,
                  price: priceExFromIncl(price_vat, vatRate),
                })
              }
            />
            <PricePair
              labelEx={tForm("itemWholesaleExVat")}
              labelIncl={tForm("itemWholesaleInclVat")}
              vatType={vatType}
              exValue={item.price_wholesale}
              inclValue={
                item.price_wholesale_vat > 0
                  ? item.price_wholesale_vat
                  : priceInclVat(item.price_wholesale, vatRate)
              }
              vatRate={vatRate}
              onExChange={(price_wholesale) =>
                patch({
                  price_wholesale,
                  price_wholesale_vat: priceInclVat(price_wholesale, vatRate),
                })
              }
              onInclChange={(price_wholesale_vat) =>
                patch({
                  price_wholesale_vat,
                  price_wholesale: priceExFromIncl(price_wholesale_vat, vatRate),
                })
              }
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
                <TableHead className="text-right">
                  {tForm("itemColPriceExVat")}
                </TableHead>
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
                  const chId = row.setting_sale_channel_id;
                  const rowOptions = channelOptionsForRow(chId);
                  const channelMeta = saleChannels.find((c) => c.id === chId);
                  const resolvedName = channelMeta?.name;
                  const { ex, incl } = channelRowExIncl(row, vatRate);
                  const phEx = tFormPh("placeholder.input", {
                    label: tForm("itemColPriceExVat"),
                  });
                  const phIncl = tFormPh("placeholder.input", {
                    label: tForm("itemColTotal"),
                  });
                  return (
                    <TableRow key={chId}>
                      <TableCell className="min-w-[12rem]">
                        <div className="flex items-center gap-2">
                          <SaleChannelLogoThumb
                            fileId={channelMeta?.system_file_id}
                            locale={locale}
                          />
                          <Select
                            value={chId > 0 ? String(chId) : undefined}
                            onValueChange={(v) => setChannelId(chId, Number(v))}
                          >
                          <SelectTrigger className="min-w-0 flex-1">
                            <SelectValue
                              placeholder={tFormPh("placeholder.select", {
                                label: tForm("itemColChannel"),
                              })}
                            >
                              {resolvedName ?? null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {rowOptions.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {vatType === "include" ? (
                          <Input
                            readOnly
                            className="ml-auto max-w-36 bg-muted/30 text-right tabular-nums"
                            value={ex.toFixed(2)}
                          />
                        ) : (
                          <Input
                            type="number"
                            inputMode="decimal"
                            className="ml-auto max-w-36 text-right tabular-nums"
                            placeholder={phEx}
                            value={String(row.price ?? 0)}
                            onChange={(e) => {
                              const price = Number(e.target.value) || 0;
                              updateChannelRow(chId, {
                                price,
                                price_vat: priceInclVat(price, vatRate),
                              });
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {vatType === "include" ? (
                          <Input
                            type="number"
                            inputMode="decimal"
                            className="ml-auto max-w-36 text-right tabular-nums"
                            placeholder={phIncl}
                            value={String(
                              row.price_vat != null && row.price_vat > 0
                                ? row.price_vat
                                : incl
                            )}
                            onChange={(e) => {
                              const price_vat = Number(e.target.value) || 0;
                              updateChannelRow(chId, {
                                price_vat,
                                price: priceExFromIncl(price_vat, vatRate),
                              });
                            }}
                          />
                        ) : (
                          <Input
                            readOnly
                            className="ml-auto max-w-36 bg-muted/30 text-right tabular-nums"
                            value={incl.toFixed(2)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {channelMarginDisplay(
                          row,
                          vatType,
                          vatRate,
                          usedLotCostPerUnit
                        )}
                        %
                      </TableCell>
                      <TableCell className="text-center">
                        <TableIconActions
                          actions={["delete"]}
                          onAction={() => removeChannelRow(chId)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {sortedChannelRows.length > TABLE_PAGE ? (
          <CrudPaginationBar
            page={channelPage}
            pageSize={10}
            meta={{
              total: sortedChannelRows.length,
              totalPages: channelTotalPages,
            }}
            onPageChange={setChannelPage}
            onPageSizeChange={() => {}}
          />
        ) : null}
        <Button
          type="button"
          size="lg"
          className="mt-3 w-full"
          onClick={addChannelRow}
        >
          <Plus className="mr-1 size-4" />
          {tForm("itemAddChannel")}
        </Button>
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
                      const rowOptions = supplierSelectOptionsForRow(
                        row.supplier_user_id
                      );
                      const resolvedSupplierName =
                        row.supplier_user_id > 0
                          ? listPartnerLabelById.get(row.supplier_user_id)
                          : undefined;
                      const phCost = tFormPh("placeholder.input", {
                        label: tForm("itemColCost"),
                      });
                      const phDiscount = tFormPh("placeholder.input", {
                        label: tForm("itemColDiscount"),
                      });
                      return (
                        <TableRow
                          key={
                            row.supplier_user_id > 0
                              ? row.supplier_user_id
                              : `draft-sup-${si}`
                          }
                        >
                          <TableCell className="min-w-[12rem]">
                            <Select
                              value={
                                row.supplier_user_id > 0
                                  ? String(row.supplier_user_id)
                                  : undefined
                              }
                              onValueChange={(v) =>
                                updateSupplierRow(si, {
                                  supplier_user_id: Number(v),
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={tFormPh("placeholder.select", {
                                    label: tForm("itemColSupplier"),
                                  })}
                                >
                                  {resolvedSupplierName ?? null}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {rowOptions.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <Input
                              type="number"
                              inputMode="decimal"
                              className="ml-auto max-w-32 text-right tabular-nums"
                              placeholder={phCost}
                              value={String(row.cost_price ?? 0)}
                              onChange={(e) =>
                                updateSupplierRow(si, {
                                  cost_price: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <Input
                              type="number"
                              inputMode="decimal"
                              className="ml-auto max-w-32 text-right tabular-nums"
                              placeholder={phDiscount}
                              value={String(row.discount ?? 0)}
                              onChange={(e) =>
                                updateSupplierRow(si, {
                                  discount: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={row.discount_type ?? "baht"}
                              onValueChange={(v) =>
                                v &&
                                updateSupplierRow(si, { discount_type: v })
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
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {supplierNetPrice(row).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <TableIconActions
                              actions={["delete"]}
                              onAction={() => {
                                patch({
                                  suppliers: (item.suppliers ?? []).filter(
                                    (_, i) => i !== si
                                  ),
                                });
                              }}
                            />
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
              size="lg"
              className="w-full"
              disabled={
                listPartnerIds.length === 0 || !hasListPartnerLeftToAdd
              }
              onClick={() => {
                if (listPartnerIds.length === 0) {
                  toast.warning(tForm("itemSupplierAddNeedsListPartners"));
                  return;
                }
                if (!hasListPartnerLeftToAdd) {
                  toast.info(tForm("itemSupplierAllAdded"));
                  return;
                }
                const list = [...(item.suppliers ?? [])];
                list.push({
                  supplier_user_id: 0,
                  cost_price: 0,
                  discount: 0,
                  discount_type: "baht",
                });
                patch({ suppliers: list });
              }}
            >
              <Plus className="mr-1 size-4" />
              {tForm("itemAddSupplier")}
            </Button>
          </TabsContent>
          <TabsContent value="warehouse" className="mt-3 space-y-3">
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tList("wpLabelWarehouse")}</TableHead>
                    <TableHead>{tList("wpLabelZone")}</TableHead>
                    <TableHead>{tList("wpLabelShelf")}</TableHead>
                    <TableHead>{tList("wpLabelRack")}</TableHead>
                    <TableHead>{tList("wpLabelBin")}</TableHead>
                    <TableHead className="text-right">
                      {tList("wpLabelQty")}
                    </TableHead>
                    <TableHead className="text-center">
                      {tCrud("table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(item.warehouse_placements ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground text-center"
                      >
                        {tForm("itemWarehouseEmpty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (item.warehouse_placements ?? []).map((wp, wi) => {
                      const meta =
                        wp.id != null && wp.id > 0
                          ? warehousePlacementMeta.find(
                              (p) => p.placement_id === wp.id
                            )
                          : undefined;
                      const effectiveBinId =
                        wp.bin_id > 0 ? wp.bin_id : meta?.bin_id ?? 0;
                      const pathHints =
                        meta != null
                          ? {
                              warehouse: meta.warehouse_name,
                              zone: meta.zone_name,
                              shelf: meta.shelf_name,
                              rack: meta.rack_name,
                              bin: meta.bin_name,
                            }
                          : undefined;
                      const qty = remainQtyForWarehousePlacement(
                        wp,
                        warehousePlacementMeta,
                        stockRows
                      );
                      return (
                        <TableRow key={wp.id ?? `wh-${wi}`}>
                          <WarehousePlacementCascadeRow
                            key={
                              wp.id ??
                              `wh-row-${wi}-${effectiveBinId}`
                            }
                            layout="table"
                            binId={effectiveBinId}
                            pathHints={pathHints}
                            onBinChange={(bin_id) => {
                              if (
                                bin_id > 0 &&
                                (item.warehouse_placements ?? []).some(
                                  (w, i) => i !== wi && w.bin_id === bin_id
                                )
                              ) {
                                toast.error(tForm("itemWarehouseBinDuplicate"));
                                return;
                              }
                              const list = [...(item.warehouse_placements ?? [])];
                              list[wi] = { ...list[wi]!, bin_id };
                              patch({ warehouse_placements: list });
                            }}
                          />
                          <TableCell>
                            <Input
                              readOnly
                              tabIndex={-1}
                              className="bg-muted/30 text-right tabular-nums"
                              value={formatStockQty(qty, locale)}
                              aria-label={tList("wpLabelQty")}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <TableIconActions
                              actions={["delete"]}
                              onAction={() =>
                                patch({
                                  warehouse_placements: (
                                    item.warehouse_placements ?? []
                                  ).filter((_, i) => i !== wi),
                                })
                              }
                            />
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
              size="lg"
              className="w-full"
              onClick={() =>
                patch({
                  warehouse_placements: [
                    ...(item.warehouse_placements ?? []),
                    { bin_id: 0 },
                  ],
                })
              }
            >
              <Plus className="mr-1 size-4" />
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
  vatType,
  exValue,
  inclValue,
  vatRate,
  onExChange,
  onInclChange,
}: {
  labelEx: string;
  labelIncl: string;
  vatType: "exclude" | "include";
  exValue: number;
  inclValue: number;
  vatRate: number;
  onExChange: (v: number) => void;
  onInclChange: (v: number) => void;
}) {
  const derivedEx =
    vatType === "include"
      ? priceExFromIncl(inclValue, vatRate)
      : exValue;
  const derivedIncl =
    vatType === "include"
      ? inclValue
      : priceInclVat(exValue, vatRate);
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3">
      <Field className="min-w-0 gap-1.5">
        <FieldLabel>{labelEx}</FieldLabel>
        {vatType === "include" ? (
          <Input
            readOnly
            value={derivedEx.toFixed(2)}
            className="bg-muted/30"
          />
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            value={String(exValue)}
            onChange={(e) => onExChange(Number(e.target.value) || 0)}
          />
        )}
      </Field>
      <Field className="min-w-0 gap-1.5">
        <FieldLabel>{labelIncl}</FieldLabel>
        {vatType === "include" ? (
          <Input
            type="number"
            inputMode="decimal"
            value={String(inclValue)}
            onChange={(e) => onInclChange(Number(e.target.value) || 0)}
          />
        ) : (
          <Input
            readOnly
            value={derivedIncl.toFixed(2)}
            className="bg-muted/30"
          />
        )}
      </Field>
    </div>
  );
}

