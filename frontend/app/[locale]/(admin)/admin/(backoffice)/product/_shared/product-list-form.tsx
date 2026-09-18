"use client";

import { Info, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CrudTabbedFormPageSkeleton } from "@/components/molecules/crud-tabbed-form-page-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { CommaTagsField } from "@/components/molecules/comma-tags-field";
import { FormField } from "@/components/molecules/form-field";
import { ProductCategoryCascadeDialog } from "@/components/molecules/product-category-cascade-dialog";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { RemoteMultiComboboxField } from "@/components/molecules/remote-multi-combobox-field";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import { resolveCategoryBreadcrumb } from "@/lib/product-category-cascade";
import {
  loadProductBrandComboboxOptions,
  resolveProductBrandLabels,
} from "@/lib/product-brand-combobox";
import {
  createProductList,
  fetchProductList,
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
import { ProductListFormPricingTab } from "./product-list-form-pricing-tab";
import { ProductListFormSidebar } from "./product-list-form-sidebar";
import {
  bodyForSave,
  emptyItem,
  hasItemSalesFieldErrors,
  type ItemSalesFieldErrors,
  applyDefaultChannelsToItems,
  type SaleChannelMeta,
  validateItemSalesFields,
  variantItemKey,
} from "./product-list-form-utils";

function emptyDraft(): ProductListAggregate {
  return {
    sku: "",
    supplier_sku: "",
    tag: "",
    note: "",
    is_active: true,
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

function ProductCodeListEditor({
  values,
  onChange,
  addLabel,
  inputPlaceholder,
  deleteAriaLabel,
  idPrefix,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  inputPlaceholder: string;
  deleteAriaLabel: string;
  idPrefix: string;
}) {
  const rows = values.length ? values : [""];

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onChange([...rows, ""])}
      >
        <Plus className="mr-1 size-4" />
        {addLabel}
      </Button>
      {rows.map((code, i) => (
        <div key={`${idPrefix}-${i}`} className="flex items-center gap-1.5">
          <Input
            id={`${idPrefix}-${i}`}
            className="min-w-0 flex-1"
            value={code}
            placeholder={inputPlaceholder}
            onChange={(e) => {
              const next = [...rows];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          {rows.length > 1 ? (
            <ButtonIcon
              type="button"
              variant="outline"
              tone="delete"
              className="shrink-0"
              aria-label={deleteAriaLabel}
              onClick={() => {
                const next = rows.filter((_, idx) => idx !== i);
                onChange(next.length ? next : [""]);
              }}
            >
              <Trash2 className="text-current" />
            </ButtonIcon>
          ) : null}
        </div>
      ))}
    </div>
  );
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
  const { open: sidebarOpen, isMobile } = useSidebar();
  const footerInsetLeft = !isMobile && sidebarOpen;

  const [tab, setTab] = useState("data");
  const [draft, setDraft] = useState<ProductListAggregate>(emptyDraft);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemFieldErrors, setItemFieldErrors] = useState<
    Record<string, ItemSalesFieldErrors>
  >({});
  const [expandVariantKey, setExpandVariantKey] = useState<string | null>(
    null
  );
  const [saleChannels, setSaleChannels] = useState<SaleChannelMeta[]>([]);
  const saleChannelsRef = useRef(saleChannels);
  saleChannelsRef.current = saleChannels;
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryBreadcrumb, setCategoryBreadcrumb] = useState("");

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
          is_default: ch.is_default === true,
          sort_order: ch.sort_order ?? 0,
          ...(ch.system_file_id != null && ch.system_file_id > 0
            ? { system_file_id: ch.system_file_id }
            : {}),
        }))
      );
    });
  }, [locale]);

  const refreshItemStockTotals = useCallback(async () => {
    if (!isEdit || !listId) return;
    try {
      const data = await fetchProductList(locale, listId);
      setDraft((d) => ({
        ...d,
        items: d.items.map((it) => {
          if (it.id == null) return it;
          const fresh = data.items.find((x) => x.id === it.id);
          if (!fresh) return it;
          return {
            ...it,
            total_stock: fresh.total_stock,
            low_stock: fresh.low_stock,
            warehouse_root_count: fresh.warehouse_root_count,
          };
        }),
      }));
    } catch {
      /* keep draft on refresh failure */
    }
  }, [isEdit, listId, locale]);

  useEffect(() => {
    if (!isEdit || !listId) return;
    setLoading(true);
    void fetchProductList(locale, listId)
      .then((data) => {
        const rawItems = data.items?.length ? data.items : [emptyItem()];
        const channels = saleChannelsRef.current;
        setDraft({
          ...data,
          factory_codes: data.factory_codes?.length ? data.factory_codes : [""],
          other_codes: data.other_codes?.length ? data.other_codes : [""],
          cars: data.cars ?? [],
          items: applyDefaultChannelsToItems(rawItems, channels),
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
      items: applyDefaultChannelsToItems(d.items, saleChannels),
    }));
  }, [saleChannels]);

  useEffect(() => {
    const id = draft.product_category_id;
    if (id == null || id <= 0) {
      setCategoryBreadcrumb("");
      return;
    }
    let cancelled = false;
    void resolveCategoryBreadcrumb(locale, id).then((label) => {
      if (!cancelled) setCategoryBreadcrumb(label);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.product_category_id, locale]);

  const itemIds = useMemo(
    () =>
      draft.items
        .map((it) => it.id)
        .filter((id): id is number => id != null && id > 0),
    [draft.items]
  );

  const handleExpandVariantHandled = useCallback(
    () => setExpandVariantKey(null),
    []
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

    const preparedItems = bodyForSave(draft).items;
    const nextItemErrors: Record<string, ItemSalesFieldErrors> = {};
    let firstInvalidKey: string | null = null;
    draft.items.forEach((item, index) => {
      const key = variantItemKey(item, index);
      const salesErrors = validateItemSalesFields(
        preparedItems[index] ?? item,
        draft.sku,
        tError("required")
      );
      if (hasItemSalesFieldErrors(salesErrors)) {
        nextItemErrors[key] = salesErrors;
        if (!firstInvalidKey) firstInvalidKey = key;
      }
    });
    setItemFieldErrors(nextItemErrors);

    const listOk = Object.keys(err).length === 0;
    const itemsOk = Object.keys(nextItemErrors).length === 0;
    if (!itemsOk) {
      setTab("pricing");
      if (firstInvalidKey) setExpandVariantKey(firstInvalidKey);
    }
    return listOk && itemsOk;
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
    return (
      <CrudTabbedFormPageSkeleton leftCardCount={3} pricingVariantStrips={2} />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
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
                    <Input
                      id="plf-category"
                      readOnly
                      className="cursor-pointer"
                      value={categoryBreadcrumb}
                      placeholder={tFormPh("placeholder.select", {
                        label: tList("filterProductCategory"),
                      })}
                      aria-label={tForm("categoryOpenAria")}
                      aria-invalid={
                        fieldErrors.productCategory ? true : undefined
                      }
                      aria-describedby={
                        fieldErrors.productCategory
                          ? "plf-category-error"
                          : undefined
                      }
                      onClick={() => setCategoryDialogOpen(true)}
                      onFocus={(e) => {
                        e.target.blur();
                        setCategoryDialogOpen(true);
                      }}
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
                  <Field className="gap-1.5">
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
                  <Field className="gap-1.5">
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
                  <Field className="gap-1.5 md:col-span-2">
                    <FieldLabel htmlFor="plf-tag">{tForm("tag")}</FieldLabel>
                    <CommaTagsField
                      id="plf-tag"
                      value={draft.tag ?? ""}
                      placeholder={tFormPh("placeholder.input", {
                        label: tForm("tag"),
                      })}
                      aria-label={tForm("tag")}
                      onChange={(tag) =>
                        setDraft((d) => ({ ...d, tag }))
                      }
                    />
                  </Field>
                </FormCardContent>
              </FormCard>

              <FormCard>
                <FormCardHeader>
                  <FormCardTitle>{tForm("sectionCodes")}</FormCardTitle>
                </FormCardHeader>
                <FormCardContent className="grid gap-4 md:grid-cols-2 md:items-start">
                  <div className="flex flex-col gap-4">
                    <Field
                      className="gap-1.5"
                      data-invalid={fieldErrors.sku ? true : undefined}
                    >
                      <FieldLabel htmlFor="plf-sku">
                        {tForm("skuProduct")}
                        <span className="text-[#dc2626]" aria-hidden>
                          {" "}
                          *
                        </span>
                      </FieldLabel>
                      <Input
                        id="plf-sku"
                        required
                        value={draft.sku}
                        aria-invalid={fieldErrors.sku ? true : undefined}
                        aria-describedby={
                          fieldErrors.sku ? "plf-sku-error" : undefined
                        }
                        placeholder={tFormPh("placeholder.input", {
                          label: tForm("skuProduct"),
                        })}
                        onChange={(e) => {
                          setDraft((d) => ({ ...d, sku: e.target.value }));
                          setFieldErrors((fe) => ({ ...fe, sku: "" }));
                        }}
                      />
                      <FieldDescription>{tForm("skuPrimaryHint")}</FieldDescription>
                      {fieldErrors.sku ? (
                        <FieldError id="plf-sku-error">
                          {fieldErrors.sku}
                        </FieldError>
                      ) : null}
                    </Field>
                    <Field className="gap-1.5">
                      <FieldLabel className="inline-flex items-center gap-1">
                        {tForm("factoryCodesOe")}
                        <Info
                          className="size-3.5 text-muted-foreground"
                          aria-label={tForm("factoryCodesOeHint")}
                        />
                      </FieldLabel>
                      <ProductCodeListEditor
                        idPrefix="plf-factory"
                        values={draft.factory_codes ?? [""]}
                        addLabel={tForm("addFactoryCodeOe")}
                        inputPlaceholder={tForm("factoryCodeInputPlaceholder")}
                        deleteAriaLabel={tCrud("btn.delete")}
                        onChange={(factory_codes) =>
                          setDraft((d) => ({ ...d, factory_codes }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="plf-supplier-sku">
                        {tForm("supplierSkuProduct")}
                      </FieldLabel>
                      <Input
                        id="plf-supplier-sku"
                        value={draft.supplier_sku ?? ""}
                        placeholder={tFormPh("placeholder.input", {
                          label: tForm("supplierSkuProduct"),
                        })}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            supplier_sku: e.target.value,
                          }))
                        }
                      />
                      <FieldDescription>
                        {tForm("supplierSkuHint")}
                      </FieldDescription>
                    </Field>
                    <Field className="gap-1.5">
                      <FieldLabel>{tForm("otherCodesRef")}</FieldLabel>
                      <ProductCodeListEditor
                        idPrefix="plf-other"
                        values={draft.other_codes ?? [""]}
                        addLabel={tForm("addOtherCodeRef")}
                        inputPlaceholder={tForm("otherCodeInputPlaceholder")}
                        deleteAriaLabel={tCrud("btn.delete")}
                        onChange={(other_codes) =>
                          setDraft((d) => ({ ...d, other_codes }))
                        }
                      />
                    </Field>
                  </div>
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

            <TabsContent value="pricing" className="mt-0">
              <ProductListFormPricingTab
                locale={locale}
                draft={draft}
                setDraft={setDraft}
                saleChannels={saleChannels}
                itemFieldErrors={itemFieldErrors}
                setItemFieldErrors={setItemFieldErrors}
                expandVariantKey={expandVariantKey}
                onExpandVariantHandled={handleExpandVariantHandled}
                canCloneItem={isEdit && perms.update}
                canMutateLots={isEdit && perms.update}
                onStockChanged={() => void refreshItemStockTotals()}
              />
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

      <ProductCategoryCascadeDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        valueId={draft.product_category_id ?? null}
        onConfirm={(id, breadcrumb) => {
          setDraft((d) => ({ ...d, product_category_id: id }));
          setCategoryBreadcrumb(breadcrumb);
          setFieldErrors((fe) => ({ ...fe, productCategory: "" }));
          toast.success(tForm("toastCategorySelected"));
        }}
      />

      <div
        className={cn(
          "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
          footerInsetLeft ? "left-(--sidebar-width)" : "left-0",
        )}
      >
        <div className="mx-auto flex w-full max-w-crud-page justify-end gap-2 px-admin-content py-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/admin/product/list")}
          >
            {isEdit ? tCrud("btn.cancel") : tCrud("btn.back")}
          </Button>
          {(isEdit ? perms.update : perms.create) ? (
            <Button
              type="button"
              size="lg"
              disabled={saving}
              onClick={() => void onSave()}
            >
              {tCrud("btn.save")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
