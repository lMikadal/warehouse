"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudTabbedFormPageSkeleton } from "@/components/molecules/crud-tabbed-form-page-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { FormField } from "@/components/molecules/form-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { RemoteMultiComboboxField } from "@/components/molecules/remote-multi-combobox-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  loadProductListFormCategoryComboboxOptions,
  resolveProductListFormCategoryLabel,
} from "@/lib/product-category-combobox";
import {
  loadProductBrandComboboxOptions,
  resolveProductBrandLabels,
} from "@/lib/product-brand-combobox";
import {
  createProductList,
  fetchProductList,
  patchProductItemFull,
  ProductListApiError,
  updateProductList,
  type ListItemBody,
  type ProductListAggregate,
} from "@/lib/product-list-api";
import {
  fetchProductListFilters,
  filterItemsToComboboxOptions,
} from "@/lib/product-filters-api";
import { cn } from "@/lib/utils";

import { ProductListFormCars } from "./product-list-form-cars";
import { ProductListFormHistory } from "./product-list-form-history";
import { ProductListFormSidebar } from "./product-list-form-sidebar";

const UNITS = [
  "piece",
  "box",
  "set",
  "roll",
  "pair",
  "bag",
  "sheet",
  "meter",
  "liter",
  "kg",
] as const;

function emptyItem(): ListItemBody {
  return {
    price: 0,
    price_wholesale: 0,
    type_price: "manual",
    unit: "piece",
    qty_per_unit: 1,
    minimum_stock: 0,
    is_active: true,
    is_stopped: false,
    is_fake: false,
    promotion: "",
    names: { th: "", en: "" },
    channel_prices: [],
    suppliers: [],
    warehouse_placements: [],
  };
}

function emptyDraft(): ProductListAggregate {
  return {
    sku: "",
    supplier_sku: "",
    tag: "",
    note: "",
    is_active: true,
    is_new: false,
    languages: {
      th: { name: "", sub_name: "", description: "" },
      en: { name: "", sub_name: "", description: "" },
    },
    factory_codes: [""],
    other_codes: [""],
    supplier_ids: [],
    cars: [],
    items: [emptyItem()],
  };
}

function bodyForSave(draft: ProductListAggregate): ProductListAggregate {
  return {
    ...draft,
    factory_codes: draft.factory_codes?.filter((c) => c.trim()) ?? [],
    other_codes: draft.other_codes?.filter((c) => c.trim()) ?? [],
    cars:
      draft.cars?.filter((c) => c.product_attribute_engine_id > 0) ?? [],
  };
}

export function ProductListForm({ listId }: { listId?: number }) {
  const isEdit = listId != null && listId > 0;
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.productListForm");
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tFormPh = useTranslations("form");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("product", "product_list");

  const [tab, setTab] = useState("data");
  const [draft, setDraft] = useState<ProductListAggregate>(emptyDraft);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saleChannels, setSaleChannels] = useState<
    { id: number; name: string }[]
  >([]);

  useEffect(() => {
    void fetchProductListFilters(locale, "sale_channels", {
      page: 1,
      limit: 100,
      isActive: true,
    }).then((res) => {
      setSaleChannels(
        res.items.map((ch) => ({
          id: ch.id,
          name: ch.name,
        }))
      );
    });
  }, [locale]);

  const mergeItemChannels = useCallback(
    (item: ListItemBody): ListItemBody => {
      if (!saleChannels.length) return item;
      const existing = item.channel_prices ?? [];
      return {
        ...item,
        channel_prices: saleChannels.map((ch) => ({
          setting_sale_channel_id: ch.id,
          price:
            existing.find((p) => p.setting_sale_channel_id === ch.id)?.price ??
            0,
        })),
      };
    },
    [saleChannels]
  );

  useEffect(() => {
    if (!isEdit || !listId) return;
    setLoading(true);
    void fetchProductList(locale, listId)
      .then((data) => {
        setDraft({
          ...data,
          factory_codes: data.factory_codes?.length ? data.factory_codes : [""],
          other_codes: data.other_codes?.length ? data.other_codes : [""],
          cars: data.cars ?? [],
          items: data.items?.length ? data.items : [emptyItem()],
        });
      })
      .catch((e) => {
        toast.error(
          e instanceof ProductListApiError ? e.message : tError("noData")
        );
      })
      .finally(() => setLoading(false));
  }, [isEdit, listId, locale, tError]);

  useEffect(() => {
    if (!saleChannels.length) return;
    setDraft((d) => ({
      ...d,
      items: d.items.map((it) => mergeItemChannels(it)),
    }));
  }, [saleChannels, mergeItemChannels]);

  const itemIds = useMemo(
    () =>
      draft.items
        .map((it) => it.id)
        .filter((id): id is number => id != null && id > 0),
    [draft.items]
  );

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!draft.sku.trim()) err.sku = tError("required");
    if (!draft.languages.th.name.trim()) err.nameTh = tError("required");
    if (!draft.languages.en.name.trim()) err.nameEn = tError("required");
    if (!draft.product_category_id || draft.product_category_id <= 0) {
      err.productCategory = tError("required");
    }
    if (!draft.product_brand_id || draft.product_brand_id <= 0) {
      err.productBrand = tError("required");
    }
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = bodyForSave(draft);
      if (isEdit && listId) {
        await updateProductList(listId, body);
        toast.success(tCrud("toast.saved"));
        router.push("/admin/product/list");
      } else {
        const id = await createProductList(body);
        toast.success(tCrud("toast.created"));
        router.push(`/admin/product/list/${id}`);
      }
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("noData")
      );
    } finally {
      setSaving(false);
    }
  };

  const saveVariant = async (index: number) => {
    const it = draft.items[index];
    if (!it?.id) {
      toast.error(tError("noData"));
      return;
    }
    try {
      await patchProductItemFull(it.id, it);
      toast.success(tCrud("toast.saved"));
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("noData")
      );
    }
  };

  const loadSuppliers = useCallback(
    async (ctx: RemoteComboboxLoadContext) => {
      const res = await fetchProductListFilters(locale, "suppliers", {
        page: 1,
        limit: 50,
        search: ctx.search.trim() || undefined,
        signal: ctx.signal,
      });
      if (ctx.signal.aborted) return [];
      return filterItemsToComboboxOptions(res.items);
    },
    [locale]
  );

  const loadBins = useCallback(
    async (ctx: RemoteComboboxLoadContext) => {
      const res = await fetchProductListFilters(locale, "warehouse_bins", {
        page: 1,
        limit: 50,
        search: ctx.search.trim() || undefined,
        signal: ctx.signal,
      });
      if (ctx.signal.aborted) return [];
      return filterItemsToComboboxOptions(res.items);
    },
    [locale]
  );

  const loadCategoryOptions = useCallback(
    (ctx: RemoteComboboxLoadContext) =>
      loadProductListFormCategoryComboboxOptions(locale, {
        search: ctx.search,
        signal: ctx.signal,
      }),
    [locale]
  );

  const loadBrandOptions = useCallback(
    (ctx: RemoteComboboxLoadContext) =>
      loadProductBrandComboboxOptions(locale, {
        search: ctx.search,
        signal: ctx.signal,
        source: "listForm",
      }),
    [locale]
  );

  if (loading) {
    return <CrudTabbedFormPageSkeleton leftCardCount={5} />;
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <CrudPageHeader title={tPage("title")} description={tPage("desc")} />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="data">{tForm("tabData")}</TabsTrigger>
          <TabsTrigger value="pricing">{tForm("tabPricing")}</TabsTrigger>
          <TabsTrigger value="history">{tForm("tabHistory")}</TabsTrigger>
        </TabsList>

        <div
          className={cn(
            "mt-4 grid gap-4",
            tab === "data" && "lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
          )}
        >
          <div className="min-w-0 space-y-4">
            <TabsContent value="data" className="mt-0 space-y-4">
              <FormCard>
                <FormCardHeader>
                  <FormCardTitle>{tForm("sectionInfo")}</FormCardTitle>
                </FormCardHeader>
                <FormCardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    id="plf-name-th"
                    labelKey="col.nameTh"
                    required
                    value={draft.languages.th.name}
                    invalid={!!fieldErrors.nameTh}
                    errorMessage={fieldErrors.nameTh}
                    onChange={(v) => {
                      setDraft((d) => ({
                        ...d,
                        languages: {
                          ...d.languages,
                          th: { ...d.languages.th, name: v },
                        },
                      }));
                      setFieldErrors((fe) => ({ ...fe, nameTh: "" }));
                    }}
                  />
                  <FormField
                    id="plf-name-en"
                    labelKey="col.nameEn"
                    required
                    value={draft.languages.en.name}
                    invalid={!!fieldErrors.nameEn}
                    errorMessage={fieldErrors.nameEn}
                    onChange={(v) => {
                      setDraft((d) => ({
                        ...d,
                        languages: {
                          ...d.languages,
                          en: { ...d.languages.en, name: v },
                        },
                      }));
                      setFieldErrors((fe) => ({ ...fe, nameEn: "" }));
                    }}
                  />
                  <Field
                    className="gap-1.5"
                    data-invalid={fieldErrors.productCategory ? true : undefined}
                  >
                    <FieldLabel htmlFor="plf-category">
                      {tList("filterProductCategory")}
                      <span className="text-[#dc2626]" aria-hidden>
                        {" "}
                        *
                      </span>
                    </FieldLabel>
                    <RemoteComboboxField
                      id="plf-category"
                      label={tList("filterProductCategory")}
                      value={
                        draft.product_category_id != null
                          ? String(draft.product_category_id)
                          : ""
                      }
                      onValueChange={(v) => {
                        setDraft((d) => ({
                          ...d,
                          product_category_id: v ? Number(v) : null,
                        }));
                        setFieldErrors((fe) => ({ ...fe, productCategory: "" }));
                      }}
                      placeholder={tFormPh("placeholder.select", {
                        label: tList("filterProductCategory"),
                      })}
                      emptyLabel={tFormPh("combobox.noResults")}
                      inputClassName="w-full"
                      invalid={!!fieldErrors.productCategory}
                      showClear
                      onLoadOptions={loadCategoryOptions}
                      resolveSelectedLabel={(value) =>
                        resolveProductListFormCategoryLabel(locale, value)
                      }
                    />
                    {fieldErrors.productCategory ? (
                      <FieldError id="plf-category-error">
                        {fieldErrors.productCategory}
                      </FieldError>
                    ) : null}
                  </Field>
                  <Field
                    className="gap-1.5"
                    data-invalid={fieldErrors.productBrand ? true : undefined}
                  >
                    <FieldLabel htmlFor="plf-brand">
                      {tCol("brand")}
                      <span className="text-[#dc2626]" aria-hidden>
                        {" "}
                        *
                      </span>
                    </FieldLabel>
                    <RemoteComboboxField
                      id="plf-brand"
                      label={tCol("brand")}
                      value={
                        draft.product_brand_id != null
                          ? String(draft.product_brand_id)
                          : ""
                      }
                      onValueChange={(v) => {
                        setDraft((d) => ({
                          ...d,
                          product_brand_id: v ? Number(v) : null,
                        }));
                        setFieldErrors((fe) => ({ ...fe, productBrand: "" }));
                      }}
                      placeholder={tFormPh("placeholder.select", {
                        label: tCol("brand"),
                      })}
                      emptyLabel={tFormPh("combobox.noResults")}
                      inputClassName="w-full"
                      invalid={!!fieldErrors.productBrand}
                      showClear
                      onLoadOptions={loadBrandOptions}
                      resolveSelectedLabel={async (value) => {
                        const opts = await resolveProductBrandLabels(
                          locale,
                          [value],
                          "listForm"
                        );
                        return opts[0]?.label ?? null;
                      }}
                    />
                    {fieldErrors.productBrand ? (
                      <FieldError id="plf-brand-error">
                        {fieldErrors.productBrand}
                      </FieldError>
                    ) : null}
                  </Field>
                </FormCardContent>
              </FormCard>

              <FormCard>
                <FormCardHeader>
                  <FormCardTitle>{tForm("sectionDetails")}</FormCardTitle>
                </FormCardHeader>
                <FormCardContent className="grid gap-4 md:grid-cols-2">
                  <Field className="gap-1.5">
                    <FieldLabel>{tForm("subNameTh")}</FieldLabel>
                    <Input
                      value={draft.languages.th.sub_name ?? ""}
                      placeholder={tFormPh("placeholder.input", {
                        label: tForm("subNameTh"),
                      })}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          languages: {
                            ...d.languages,
                            th: { ...d.languages.th, sub_name: e.target.value },
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel>{tForm("subNameEn")}</FieldLabel>
                    <Input
                      value={draft.languages.en.sub_name ?? ""}
                      placeholder={tFormPh("placeholder.input", {
                        label: tForm("subNameEn"),
                      })}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          languages: {
                            ...d.languages,
                            en: { ...d.languages.en, sub_name: e.target.value },
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field className="gap-1.5 md:col-span-2">
                    <FieldLabel>{tForm("descTh")}</FieldLabel>
                    <Textarea
                      value={draft.languages.th.description ?? ""}
                      placeholder={tFormPh("placeholder.input", {
                        label: tForm("descTh"),
                      })}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          languages: {
                            ...d.languages,
                            th: {
                              ...d.languages.th,
                              description: e.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field className="gap-1.5 md:col-span-2">
                    <FieldLabel>{tForm("descEn")}</FieldLabel>
                    <Textarea
                      value={draft.languages.en.description ?? ""}
                      placeholder={tFormPh("placeholder.input", {
                        label: tForm("descEn"),
                      })}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          languages: {
                            ...d.languages,
                            en: {
                              ...d.languages.en,
                              description: e.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                </FormCardContent>
              </FormCard>

              <FormCard>
                <FormCardHeader>
                  <FormCardTitle>{tForm("sectionCodes")}</FormCardTitle>
                </FormCardHeader>
                <FormCardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    id="plf-sku"
                    labelKey="col.sku"
                    required
                    value={draft.sku}
                    invalid={!!fieldErrors.sku}
                    errorMessage={fieldErrors.sku}
                    onChange={(v) => {
                      setDraft((d) => ({ ...d, sku: v }));
                      setFieldErrors((fe) => ({ ...fe, sku: "" }));
                    }}
                  />
                  <Field className="gap-1.5">
                    <FieldLabel>{tForm("supplierSku")}</FieldLabel>
                    <Input
                      value={draft.supplier_sku ?? ""}
                      placeholder={tFormPh("placeholder.input", {
                        label: tForm("supplierSku"),
                      })}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, supplier_sku: e.target.value }))
                      }
                    />
                  </Field>
                  <Field className="gap-1.5 md:col-span-2">
                    <FieldLabel>{tForm("tag")}</FieldLabel>
                    <Input
                      value={draft.tag ?? ""}
                      placeholder={tFormPh("placeholder.input", {
                        label: tForm("tag"),
                      })}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, tag: e.target.value }))
                      }
                    />
                  </Field>
                  <Field className="gap-1.5 md:col-span-2">
                    <FieldLabel>{tForm("factoryCodes")}</FieldLabel>
                    <div className="space-y-2">
                      {(draft.factory_codes ?? [""]).map((code, i) => (
                        <Input
                          key={`factory-${i}`}
                          value={code}
                          placeholder={tFormPh("placeholder.input", {
                            label: tForm("factoryCodes"),
                          })}
                          onChange={(e) =>
                            setDraft((d) => {
                              const factory_codes = [...(d.factory_codes ?? [""])];
                              factory_codes[i] = e.target.value;
                              return { ...d, factory_codes };
                            })
                          }
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            factory_codes: [...(d.factory_codes ?? [""]), ""],
                          }))
                        }
                      >
                        {tForm("addFactoryCode")}
                      </Button>
                    </div>
                  </Field>
                  <Field className="gap-1.5 md:col-span-2">
                    <FieldLabel>{tForm("otherCodes")}</FieldLabel>
                    <div className="space-y-2">
                      {(draft.other_codes ?? [""]).map((code, i) => (
                        <Input
                          key={`other-${i}`}
                          value={code}
                          placeholder={tFormPh("placeholder.input", {
                            label: tForm("otherCodes"),
                          })}
                          onChange={(e) =>
                            setDraft((d) => {
                              const other_codes = [...(d.other_codes ?? [""])];
                              other_codes[i] = e.target.value;
                              return { ...d, other_codes };
                            })
                          }
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            other_codes: [...(d.other_codes ?? [""]), ""],
                          }))
                        }
                      >
                        {tForm("addOtherCode")}
                      </Button>
                    </div>
                  </Field>
                </FormCardContent>
              </FormCard>

              <FormCard>
                <FormCardHeader>
                  <FormCardTitle>{tForm("sectionPartners")}</FormCardTitle>
                </FormCardHeader>
                <FormCardContent>
                  <RemoteMultiComboboxField
                    label={tForm("partners")}
                    values={(draft.supplier_ids ?? []).map(String)}
                    onValuesChange={(vals) =>
                      setDraft((d) => ({
                        ...d,
                        supplier_ids: vals.map(Number).filter((n) => n > 0),
                      }))
                    }
                    placeholder={tFormPh("placeholder.select", {
                      label: tForm("partners"),
                    })}
                    emptyLabel={tFormPh("combobox.noResults")}
                    onLoadOptions={loadSuppliers}
                  />
                </FormCardContent>
              </FormCard>

              <FormCard>
                <FormCardHeader>
                  <FormCardTitle>{tForm("sectionCars")}</FormCardTitle>
                </FormCardHeader>
                <FormCardContent>
                  <ProductListFormCars
                    locale={locale}
                    cars={draft.cars ?? []}
                    onChange={(cars) => setDraft((d) => ({ ...d, cars }))}
                  />
                </FormCardContent>
              </FormCard>
            </TabsContent>

            <TabsContent value="pricing" className="mt-0 space-y-4">
              {draft.items.map((item, index) => (
                <FormCard key={item.id ?? index}>
                  <FormCardHeader className="flex flex-row items-center justify-between">
                    <FormCardTitle>
                      {tForm("itemTitle", { index: index + 1 })}
                    </FormCardTitle>
                    {isEdit && item.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void saveVariant(index)}
                      >
                        {tCrud("btn.save")}
                      </Button>
                    ) : null}
                  </FormCardHeader>
                  <FormCardContent className="grid gap-4 md:grid-cols-2">
                    <Field className="gap-1.5">
                      <FieldLabel>{tForm("variantName")}</FieldLabel>
                      <Input
                        value={item.names.th}
                        placeholder={tFormPh("placeholder.input", {
                          label: tForm("nameTh"),
                        })}
                        onChange={(e) =>
                          setDraft((d) => {
                            const items = [...d.items];
                            items[index] = {
                              ...items[index],
                              names: {
                                ...items[index].names,
                                th: e.target.value,
                              },
                            };
                            return { ...d, items };
                          })
                        }
                      />
                    </Field>
                    <Field className="gap-1.5">
                      <FieldLabel>{tCol("sku")}</FieldLabel>
                      <Input
                        value={item.sku ?? ""}
                        placeholder={tFormPh("placeholder.input", {
                          label: tCol("sku"),
                        })}
                        onChange={(e) =>
                          setDraft((d) => {
                            const items = [...d.items];
                            items[index] = { ...items[index], sku: e.target.value };
                            return { ...d, items };
                          })
                        }
                      />
                    </Field>
                    <Field className="gap-1.5">
                      <FieldLabel>{tList("colNetPrice")}</FieldLabel>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={String(item.price)}
                        onChange={(e) =>
                          setDraft((d) => {
                            const items = [...d.items];
                            items[index] = {
                              ...items[index],
                              price: Number(e.target.value) || 0,
                            };
                            return { ...d, items };
                          })
                        }
                      />
                    </Field>
                    <Field className="gap-1.5">
                      <FieldLabel>{tForm("qtyPerUnit")}</FieldLabel>
                      <Input
                        type="number"
                        value={String(item.qty_per_unit)}
                        onChange={(e) =>
                          setDraft((d) => {
                            const items = [...d.items];
                            items[index] = {
                              ...items[index],
                              qty_per_unit: Number(e.target.value) || 1,
                            };
                            return { ...d, items };
                          })
                        }
                      />
                    </Field>
                    <Field className="gap-1.5">
                      <FieldLabel>{tCol("unit")}</FieldLabel>
                      <Select
                        value={item.unit}
                        onValueChange={(v) => {
                          if (!v) return;
                          setDraft((d) => {
                            const items = [...d.items];
                            items[index] = { ...items[index], unit: v };
                            return { ...d, items };
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field className="gap-1.5">
                      <FieldLabel>{tForm("minimumStock")}</FieldLabel>
                      <Input
                        type="number"
                        value={String(item.minimum_stock)}
                        onChange={(e) =>
                          setDraft((d) => {
                            const items = [...d.items];
                            items[index] = {
                              ...items[index],
                              minimum_stock: Number(e.target.value) || 0,
                            };
                            return { ...d, items };
                          })
                        }
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <StatusSwitchField
                        labelKey="col.status"
                        checked={item.is_active}
                        onCheckedChange={(checked) =>
                          setDraft((d) => {
                            const items = [...d.items];
                            items[index] = { ...items[index], is_active: checked };
                            return { ...d, items };
                          })
                        }
                      />
                    </div>
                    <Field className="gap-1.5 md:col-span-2">
                      <FieldLabel>{tList("wpLabelBin")}</FieldLabel>
                      <RemoteComboboxField
                        label={tList("wpLabelBin")}
                        value={
                          item.warehouse_placements?.[0]?.bin_id
                            ? String(item.warehouse_placements[0].bin_id)
                            : ""
                        }
                        onValueChange={(v) =>
                          setDraft((d) => {
                            const items = [...d.items];
                            items[index] = {
                              ...items[index],
                              warehouse_placements: v
                                ? [{ bin_id: Number(v) }]
                                : [],
                            };
                            return { ...d, items };
                          })
                        }
                        placeholder={tFormPh("placeholder.select", {
                          label: tList("wpLabelBin"),
                        })}
                        emptyLabel={tFormPh("combobox.noResults")}
                        inputClassName="w-full"
                        showClear
                        onLoadOptions={loadBins}
                      />
                    </Field>
                    {saleChannels.length ? (
                      <div className="md:col-span-2 space-y-2">
                        <FieldLabel>{tForm("itemSectionChannel")}</FieldLabel>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {saleChannels.map((ch) => {
                            const price =
                              item.channel_prices?.find(
                                (p) => p.setting_sale_channel_id === ch.id
                              )?.price ?? 0;
                            return (
                              <Field key={ch.id} className="gap-1.5">
                                <FieldLabel className="text-xs font-normal">
                                  {ch.name}
                                </FieldLabel>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  value={String(price)}
                                  placeholder={tFormPh("placeholder.input", {
                                    label: ch.name,
                                  })}
                                  onChange={(e) =>
                                    setDraft((d) => {
                                      const items = [...d.items];
                                      const cp = [
                                        ...(items[index].channel_prices ?? []),
                                      ];
                                      const idx = cp.findIndex(
                                        (p) =>
                                          p.setting_sale_channel_id === ch.id
                                      );
                                      const nextPrice =
                                        Number(e.target.value) || 0;
                                      if (idx >= 0) {
                                        cp[idx] = {
                                          ...cp[idx],
                                          price: nextPrice,
                                        };
                                      } else {
                                        cp.push({
                                          setting_sale_channel_id: ch.id,
                                          price: nextPrice,
                                        });
                                      }
                                      items[index] = {
                                        ...items[index],
                                        channel_prices: cp,
                                      };
                                      return { ...d, items };
                                    })
                                  }
                                />
                              </Field>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </FormCardContent>
                </FormCard>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraft((d) => ({ ...d, items: [...d.items, emptyItem()] }))
                }
              >
                {tForm("addItem")}
              </Button>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <ProductListFormHistory itemIds={itemIds} />
            </TabsContent>
          </div>

          {tab === "data" ? (
            <aside className="space-y-4">
              <ProductListFormSidebar
                draft={draft}
                canEditNote={isEdit ? perms.update : perms.create}
                onActiveChange={(checked) =>
                  setDraft((d) => ({ ...d, is_active: checked }))
                }
                onNoteChange={(note) =>
                  setDraft((d) => ({ ...d, note }))
                }
              />
            </aside>
          ) : null}
        </div>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 z-10 flex justify-end gap-2 border-t border-border bg-background p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/product/list")}
        >
          {isEdit ? tCrud("btn.cancel") : tCrud("btn.back")}
        </Button>
        {(isEdit ? perms.update : perms.create) ? (
          <Button type="button" disabled={saving} onClick={() => void onSave()}>
            {tCrud("btn.save")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
