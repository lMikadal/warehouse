"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { FormField } from "@/components/molecules/form-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { RemoteMultiComboboxField } from "@/components/molecules/remote-multi-combobox-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import {
  loadCategoryParentComboboxOptions,
  resolveCategoryParentComboboxLabel,
} from "@/lib/product-category-combobox";
import {
  loadProductBrandComboboxOptions,
  resolveProductBrandLabels,
} from "@/lib/product-brand-combobox";
import {
  createProductAttribute,
  deleteProductAttribute,
  fetchProductAttribute,
  fetchProductAttributes,
  moveProductCategory,
  patchProductAttribute,
  ProductAttributeApiError,
  moveProductCars,
  type ProductAttributeRow,
} from "@/lib/product-attribute-api";

import {
  ProductAttributeListTable,
  type AttributeDragIntent,
} from "./product-attribute-list-table";
import type { ProductAttributePageConfig } from "./product-attribute-config";

const CAR_LEVELS = ["brand", "model", "engine"] as const;

type FormState = {
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  parentId: string;
  brandIds: number[];
  typeCar: string;
  carBrandId: string;
  carModelId: string;
};

const emptyForm = (): FormState => ({
  nameTh: "",
  nameEn: "",
  isActive: true,
  parentId: "",
  brandIds: [],
  typeCar: "brand",
  carBrandId: "",
  carModelId: "",
});

export function ProductAttributePage({ config }: { config: ProductAttributePageConfig }) {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations(`page.${config.pageNs}`);
  const tAttr = useTranslations("productAttr");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");
  const tError = useTranslations("error");

  const perms = useResourcePermissions("product", config.permType);

  const listQuery = useCrudListQuery();
  const {
    query,
    statusFilter,
    pageSize,
    listFiltered,
    baseListParams,
    dragEnabled: listDragEnabled,
    onSearchChange,
    onStatusFilterChange,
    onPageSizeChange,
    setPage,
    totalPages: listTotalPages,
    safePage: listSafePage,
  } = listQuery;

  const [listRows, setListRows] = useState<ProductAttributeRow[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTreePath, setEditingTreePath] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const listFetchParams = useMemo(
    () => ({
      page: baseListParams.page,
      limit: baseListParams.limit,
      search: baseListParams.search,
      isActive: baseListParams.isActive,
    }),
    [baseListParams]
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProductAttributes(
        config.segment,
        locale,
        listFetchParams
      );
      setListRows(res.items);
      setListMeta(res.meta);
    } catch (e) {
      toast.error(
        e instanceof ProductAttributeApiError ? e.message : tError("noData")
      );
    } finally {
      setLoading(false);
    }
  }, [config.segment, locale, listFetchParams, tError]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const total = listMeta.total;
  const totalPages = listTotalPages(total);
  const safePage = listSafePage(total);
  const dragEnabled = listDragEnabled && perms.update;

  const selectRow = useCallback(
    async (id: number) => {
      setEditingId(id);
      setFieldErrors({});
      try {
        const detail = await fetchProductAttribute(config.segment, locale, id);
        setEditingTreePath(detail.tree_path ?? null);
        setForm({
          nameTh: detail.names?.th ?? "",
          nameEn: detail.names?.en ?? "",
          isActive: detail.is_active,
          parentId: detail.parent_id != null ? String(detail.parent_id) : "",
          brandIds: detail.brand_ids ?? [],
          typeCar: detail.type_car ?? "brand",
          carBrandId: "",
          carModelId: "",
        });
        if (config.kind === "car" && detail.type_car === "model" && detail.parent_id) {
          setForm((f) => ({ ...f, carBrandId: String(detail.parent_id) }));
        }
        if (
          config.kind === "car" &&
          detail.type_car === "engine" &&
          detail.parent_id
        ) {
          setForm((f) => ({ ...f, carModelId: String(detail.parent_id) }));
          try {
            const model = await fetchProductAttribute(
              config.segment,
              locale,
              detail.parent_id
            );
            if (model.parent_id != null) {
              setForm((f) => ({
                ...f,
                carBrandId: String(model.parent_id),
              }));
            }
          } catch {
            toast.error(tError("noData"));
          }
        }
      } catch {
        toast.error(tError("noData"));
      }
    },
    [config.kind, config.segment, locale, tError]
  );

  const resetForm = () => {
    setEditingId(null);
    setEditingTreePath(null);
    setForm(emptyForm());
    setFieldErrors({});
  };

  const categoryParentRootOption = useMemo(
    () => ({ value: "", label: tAttr("parentRoot") }),
    [tAttr]
  );

  const loadCategoryParentOptions = useCallback(
    (ctx: { search: string; signal: AbortSignal }) =>
      loadCategoryParentComboboxOptions(locale, {
        search: ctx.search,
        signal: ctx.signal,
        editCategoryId: editingId,
        editTreePath: editingTreePath,
      }),
    [locale, editingId, editingTreePath]
  );

  const resolveCategoryParentLabel = useCallback(
    (value: string) => {
      if (value === "") return Promise.resolve(tAttr("parentRoot"));
      return resolveCategoryParentComboboxLabel(locale, value);
    },
    [locale, tAttr]
  );

  const loadBrandComboboxOptions = useCallback(
    (ctx: { search: string; signal: AbortSignal }) =>
      loadProductBrandComboboxOptions(locale, {
        search: ctx.search,
        signal: ctx.signal,
      }),
    [locale]
  );

  const resolveBrandComboboxLabels = useCallback(
    (ids: string[]) => resolveProductBrandLabels(locale, ids),
    [locale]
  );

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!form.nameTh.trim() || !form.nameEn.trim()) {
      if (!form.nameTh.trim()) err.nameTh = tError("required");
      if (!form.nameEn.trim()) err.nameEn = tError("required");
    }
    if (config.kind === "car") {
      if (form.typeCar === "model" && !form.carBrandId) {
        err.carBrandId = tAttr("carBrandRequired");
      }
      if (form.typeCar === "engine") {
        if (!form.carBrandId) err.carBrandId = tAttr("carBrandRequired");
        if (!form.carModelId) err.carModelId = tAttr("carModelRequired");
      }
    }
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const resolveCarParentId = (): number | null | undefined => {
    if (config.kind !== "car") return undefined;
    if (form.typeCar === "brand") return null;
    if (form.typeCar === "model") return Number(form.carBrandId) || null;
    return Number(form.carModelId) || null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const canWrite = editingId ? perms.update : perms.create;
    if (!canWrite) return;
    setSaving(true);
    try {
      const body = {
        is_active: form.isActive,
        names: { th: form.nameTh.trim(), en: form.nameEn.trim() },
      };
      if (config.kind === "category") {
        Object.assign(body, {
          parent_id: form.parentId ? Number(form.parentId) : null,
          brand_ids: form.brandIds,
        });
      }
      if (config.kind === "car") {
        Object.assign(body, {
          type_car: form.typeCar,
          parent_id: resolveCarParentId(),
        });
      }
      if (editingId) {
        await patchProductAttribute(config.segment, locale, editingId, body);
        toast.success(tCrud("toast.saved"));
      } else {
        await createProductAttribute(config.segment, locale, body);
        toast.success(tCrud("toast.created"));
      }
      resetForm();
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof ProductAttributeApiError ? err.message : tError("noData")
      );
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (row: ProductAttributeRow, next: boolean) => {
    if (!perms.update) return;
    try {
      await patchProductAttribute(config.segment, locale, row.id, {
        is_active: next,
      });
      toast.success(tCrud("toast.saved"));
      await loadList();
    } catch {
      toast.error(tError("noData"));
    }
  };

  const onConfirmDelete = async () => {
    if (deleteId == null || !perms.delete) return;
    try {
      await deleteProductAttribute(config.segment, deleteId);
      toast.success(tCrud("toast.deleted"));
      if (editingId === deleteId) resetForm();
      setDeleteId(null);
      await loadList();
    } catch {
      toast.error(tError("noData"));
    }
  };

  const onCategoryMove = async (intent: AttributeDragIntent) => {
    await moveProductCategory(intent.dragId, intent.targetId, intent.zone);
    await loadList();
  };

  const onCarMove = async (intent: AttributeDragIntent) => {
    await moveProductCars(intent.dragId, intent.targetId, intent.zone);
    await loadList();
  };

  const loadCarPickerRows = useCallback(
    async (typeCar: "brand" | "model", brandId?: number) => {
      const res = await fetchProductAttributes(config.segment, locale, {
        page: 1,
        limit: 100,
        isActive: true,
      });
      return res.items.filter((r) => {
        if (r.type_car !== typeCar) return false;
        if (typeCar === "model" && brandId != null) {
          return r.parent_id === brandId;
        }
        return true;
      });
    },
    [config.segment, locale]
  );

  const readOnly = editingId ? !perms.update : !perms.create;

  const categoryParentLabel = tAttr("parentCategory");
  const categoryParentPlaceholder = tForm("placeholder.select", {
    label: categoryParentLabel,
  });
  const brandMultiPlaceholder = tForm("placeholder.select", {
    label: tAttr("categoryBrands"),
  });

  return (
    <div className="flex flex-col gap-6">
      <CrudPageHeader title={tPage("title")} description={tPage("desc")} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 lg:min-h-[min(70vh,640px)]">
          <div className="flex flex-wrap items-center gap-3">
            <CrudSearchField
              id={`product-${config.kind}-search`}
              className="min-w-0 flex-1"
              value={query}
              onChange={onSearchChange}
            />
            <StatusFilterGroup
              value={statusFilter}
              onChange={onStatusFilterChange}
            />
          </div>

          <div className="surface-table-wrap min-h-0 flex-1 overflow-x-auto">
            <ProductAttributeListTable
              config={config}
              rows={listRows}
              loading={loading}
              locale={locale}
              perms={perms}
              dragEnabled={dragEnabled}
              editingId={editingId}
              onToggleActive={(row, v) => void onToggleActive(row, v)}
              onSelect={(id) => void selectRow(id)}
              onDelete={setDeleteId}
              onCategoryMove={onCategoryMove}
              onCarMove={onCarMove}
            />
          </div>

          <CrudPaginationBar
            page={safePage}
            pageSize={pageSize}
            meta={{ total, totalPages }}
            onPageChange={setPage}
            onPageSizeChange={onPageSizeChange}
          />
        </div>

        <div className="h-fit w-full min-w-0 self-start rounded-lg border border-border bg-card p-4">
          <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)} noValidate>
            <FormField
              id="attr-name-th"
              labelKey="col.nameTh"
              required
              value={form.nameTh}
              onChange={(v) => {
                setForm((f) => ({ ...f, nameTh: v }));
                setFieldErrors((e) => ({ ...e, nameTh: "" }));
              }}
              invalid={!!fieldErrors.nameTh}
              errorMessage={fieldErrors.nameTh}
              readOnly={readOnly}
            />
            <FormField
              id="attr-name-en"
              labelKey="col.nameEn"
              required
              value={form.nameEn}
              onChange={(v) => {
                setForm((f) => ({ ...f, nameEn: v }));
                setFieldErrors((e) => ({ ...e, nameEn: "" }));
              }}
              invalid={!!fieldErrors.nameEn}
              errorMessage={fieldErrors.nameEn}
              readOnly={readOnly}
            />

            {config.kind === "category" ? (
              <>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="attr-parent-category">
                    {categoryParentLabel}
                  </FieldLabel>
                  <RemoteComboboxField
                    id="attr-parent-category"
                    label={categoryParentLabel}
                    value={form.parentId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, parentId: v }))
                    }
                    disabled={readOnly}
                    placeholder={categoryParentPlaceholder}
                    emptyLabel={tForm("combobox.noResults")}
                    inputClassName="w-full"
                    pinnedItems={[categoryParentRootOption]}
                    showClear={form.parentId !== ""}
                    onLoadOptions={loadCategoryParentOptions}
                    resolveSelectedLabel={resolveCategoryParentLabel}
                  />
                </Field>
                <RemoteMultiComboboxField
                  id="attr-category-brands"
                  label={tAttr("categoryBrands")}
                  values={form.brandIds.map(String)}
                  onValuesChange={(next) =>
                    setForm((f) => ({
                      ...f,
                      brandIds: next
                        .map((v) => Number(v))
                        .filter((id) => Number.isFinite(id)),
                    }))
                  }
                  disabled={readOnly}
                  placeholder={brandMultiPlaceholder}
                  emptyLabel={tForm("combobox.noResults")}
                  inputClassName="w-full"
                  onLoadOptions={loadBrandComboboxOptions}
                  resolveSelectedLabels={resolveBrandComboboxLabels}
                />
              </>
            ) : null}

            {config.kind === "car" && !editingId ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="type-car">
                    {tAttr("carLevel.label")}
                  </label>
                  <Select
                    value={form.typeCar}
                    onValueChange={(v) => {
                      if (v) setForm((f) => ({ ...f, typeCar: v }));
                    }}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="type-car" className="w-full">
                      <SelectValue
                        placeholder={tForm("placeholder.select", {
                          label: tAttr("carLevel.label"),
                        })}
                      >
                        {CAR_LEVELS.includes(
                          form.typeCar as (typeof CAR_LEVELS)[number]
                        )
                          ? tAttr(
                              `carLevel.${form.typeCar}` as
                                | "carLevel.brand"
                                | "carLevel.model"
                                | "carLevel.engine"
                            )
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand">{tAttr("carLevel.brand")}</SelectItem>
                      <SelectItem value="model">{tAttr("carLevel.model")}</SelectItem>
                      <SelectItem value="engine">{tAttr("carLevel.engine")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.typeCar === "model" || form.typeCar === "engine" ? (
                  <RemoteComboboxField
                    label={tAttr("carBrand")}
                    value={form.carBrandId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, carBrandId: v, carModelId: "" }))
                    }
                    disabled={readOnly}
                    placeholder={tForm("placeholder.select", {
                      label: tAttr("carBrand"),
                    })}
                    emptyLabel={tForm("combobox.noResults")}
                    inputClassName="w-full"
                    onLoadOptions={async () => {
                      const items = await loadCarPickerRows("brand");
                      return items.map((r) => ({
                        value: String(r.id),
                        label: r.name,
                      }));
                    }}
                  />
                ) : null}
                {form.typeCar === "engine" ? (
                  <RemoteComboboxField
                    label={tAttr("carModel")}
                    value={form.carModelId}
                    onValueChange={(v) => setForm((f) => ({ ...f, carModelId: v }))}
                    disabled={readOnly || !form.carBrandId}
                    placeholder={tForm("placeholder.select", {
                      label: tAttr("carModel"),
                    })}
                    emptyLabel={tForm("combobox.noResults")}
                    inputClassName="w-full"
                    onLoadOptions={async () => {
                      const brandId = Number(form.carBrandId);
                      if (!brandId) return [];
                      const items = await loadCarPickerRows("model", brandId);
                      return items.map((r) => ({
                        value: String(r.id),
                        label: r.name,
                      }));
                    }}
                  />
                ) : null}
              </>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{tCol("active")}</span>
              <StatusSwitchField
                checked={form.isActive}
                disabled={readOnly}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>

            {!readOnly ? (
              <Button type="submit" size="lg" disabled={saving}>
                {editingId ? tCrud("btn.save") : tCrud("btn.create")}
              </Button>
            ) : null}
            {editingId ? (
              <Button type="button" size="lg" variant="outline" onClick={resetForm}>
                {tCrud("btn.cancel")}
              </Button>
            ) : null}
          </form>
        </div>
      </div>

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  );
}
