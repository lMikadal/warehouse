"use client";

import { Filter, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Input } from "@/components/ui/input";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { type DisplayLocale } from "@/lib/format-datetime";
import {
  fetchOrderSalesFormItems,
  loadOrderSalesCarBrandComboboxOptions,
  loadOrderSalesCarModelComboboxOptions,
  loadOrderSalesCategoryComboboxOptions,
  resolveOrderSalesCarBrandLabel,
  resolveOrderSalesCarModelLabel,
  resolveOrderSalesCategoryLabel,
  type OrderSalesFormResource,
} from "@/lib/order-sales-form-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";

import {
  StoreSalesProductBrowseEmpty,
  StoreSalesProductBrowseTable,
} from "./store-sales-product-browse-table";

/** Car years the v1 filter offered: this year back 30 years. */
function carYearOptions(search: string): { value: string; label: string }[] {
  const now = new Date().getFullYear();
  const years: string[] = [];
  for (let y = now; y >= now - 30; y--) years.push(String(y));
  const q = search.trim();
  return (q ? years.filter((y) => y.includes(q)) : years).map((y) => ({
    value: y,
    label: y,
  }));
}

export type StoreSalesProductBrowsePanelProps = {
  /** RBAC resource the reads ride on (`tickets`, `purchases`, `store-sales`, …). */
  resource: OrderSalesFormResource;
  onAdd: (row: ProductItemBrowseRow) => void;
  /** Quantities already in the cart, keyed by product_item id, for the row badge. */
  cartQtyByItemId?: Record<number, number>;
  disabled?: boolean;
  /** Purchase-side forms order what is *not* in stock, so they opt out of the stock gate. */
  allowOutOfStock?: boolean;
  /** Restricts rows to a refill bucket: "low_stock" | "is_stop" | "ordered". */
  refillFilter?: string;
  /** Skip the "press search first" gate and load as soon as the panel mounts. */
  autoLoad?: boolean;
};

/**
 * Catalogue browse column shared by the sales/purchase forms and the refill tab: search + category
 * + collapsible car filters, the browse table, and its pagination.
 */
export function StoreSalesProductBrowsePanel({
  resource,
  onAdd,
  cartQtyByItemId = {},
  disabled = false,
  allowOutOfStock = false,
  refillFilter,
  autoLoad = false,
}: StoreSalesProductBrowsePanelProps) {
  const locale = useLocale();
  const displayLocale = locale as DisplayLocale;
  const tForm = useTranslations("page.orderTicket.form");
  const tStoreForm = useTranslations("page.orderStore.form");
  const tFormRoot = useTranslations("form");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const tProductAttr = useTranslations("productAttr");

  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [requested, setRequested] = useState(autoLoad);
  const [categoryId, setCategoryId] = useState("");
  const [carBrandId, setCarBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [carYear, setCarYear] = useState("");
  const [oem, setOem] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [rows, setRows] = useState<ProductItemBrowseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const {
    page,
    setPage,
    pageSize,
    onPageSizeChange,
    sortKey,
    sortDir,
    handleSortChange,
    totalPages,
    safePage,
  } = useCrudListQuery({});

  const load = useCallback(async () => {
    if (!requested) return;
    setLoading(true);
    try {
      const res = await fetchOrderSalesFormItems(locale, resource, {
        page,
        limit: pageSize,
        search: searchApplied || undefined,
        isActive: true,
        productCategoryId: categoryId ? Number(categoryId) : undefined,
        carBrandId: carBrandId ? Number(carBrandId) : undefined,
        productAttributeModelId: modelId ? Number(modelId) : undefined,
        carYear: carYear ? Number(carYear) : undefined,
        oem: oem.trim() || undefined,
        refillFilter,
        sort: sortKey ?? undefined,
        order: sortDir ?? undefined,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch {
      toast.error(tError("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [
    locale,
    resource,
    requested,
    searchApplied,
    page,
    pageSize,
    categoryId,
    carBrandId,
    modelId,
    carYear,
    oem,
    refillFilter,
    sortKey,
    sortDir,
    tError,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const addSelected = () => {
    for (const row of rows) if (selected[row.id]) onAdd(row);
    setSelected({});
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex min-w-0 flex-1 basis-48 items-end gap-1.5">
            <CrudSearchField
              id={`${resource}-product-search`}
              className="min-w-0 flex-1"
              value={search}
              onChange={setSearch}
              placeholder={tForm("searchPlaceholder")}
              disabled={disabled}
            />
            <ButtonIcon
              type="button"
              variant="outline"
              size="lg"
              className="shrink-0"
              disabled={disabled}
              aria-label={tForm("search")}
              onClick={() => {
                setSearchApplied(search.trim());
                setRequested(true);
                setPage(1);
              }}
            >
              <Search className="text-primary" aria-hidden />
            </ButtonIcon>
          </div>
          <div className="min-w-[7rem] flex-[0_1_10rem]">
            <RemoteComboboxField
              label={tStoreForm("filterCategory")}
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setPage(1);
              }}
              placeholder={tCrud("filter.select", {
                label: tStoreForm("filterCategory"),
              })}
              emptyLabel={tFormRoot("combobox.noResults")}
              inputClassName="w-full min-w-[10rem]"
              showClear
              disabled={disabled}
              onLoadOptions={(ctx) =>
                loadOrderSalesCategoryComboboxOptions(displayLocale, resource, {
                  search: ctx.search,
                  signal: ctx.signal,
                })
              }
              resolveSelectedLabel={(value) =>
                resolveOrderSalesCategoryLabel(displayLocale, resource, value)
              }
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-1.5 border-primary text-primary hover:bg-primary/10 hover:text-primary"
            aria-expanded={filterOpen}
            disabled={disabled}
            onClick={() => setFilterOpen((o) => !o)}
          >
            <Filter className="size-4 text-current" aria-hidden />
            {tStoreForm("filter")}
          </Button>
        </div>
        {filterOpen ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RemoteComboboxField
              label={tProductAttr("carBrand")}
              value={carBrandId}
              onValueChange={(v) => {
                setCarBrandId(v);
                setModelId("");
                setPage(1);
              }}
              placeholder={tFormRoot("placeholder.select", {
                label: tProductAttr("carBrand"),
              })}
              emptyLabel={tFormRoot("combobox.noResults")}
              inputClassName="w-full"
              showClear
              disabled={disabled}
              onLoadOptions={(ctx) =>
                loadOrderSalesCarBrandComboboxOptions(displayLocale, resource, {
                  search: ctx.search,
                  signal: ctx.signal,
                })
              }
              resolveSelectedLabel={async (value) => {
                const id = Number(value);
                if (!Number.isFinite(id)) return null;
                return resolveOrderSalesCarBrandLabel(
                  displayLocale,
                  resource,
                  id
                );
              }}
            />
            <RemoteComboboxField
              label={tStoreForm("filterModel")}
              value={modelId}
              onValueChange={(v) => {
                setModelId(v);
                setPage(1);
              }}
              placeholder={tFormRoot("placeholder.select", {
                label: tStoreForm("filterModel"),
              })}
              emptyLabel={tFormRoot("combobox.noResults")}
              inputClassName="w-full"
              showClear
              disabled={disabled || !carBrandId}
              onLoadOptions={(ctx) =>
                loadOrderSalesCarModelComboboxOptions(displayLocale, resource, {
                  search: ctx.search,
                  signal: ctx.signal,
                  parentId: carBrandId ? Number(carBrandId) : undefined,
                })
              }
              resolveSelectedLabel={async (value) => {
                const id = Number(value);
                if (!Number.isFinite(id)) return null;
                return resolveOrderSalesCarModelLabel(
                  displayLocale,
                  resource,
                  id
                );
              }}
            />
            <RemoteComboboxField
              label={tStoreForm("filterYear")}
              value={carYear}
              onValueChange={(v) => {
                setCarYear(v);
                setPage(1);
              }}
              placeholder={tFormRoot("placeholder.select", {
                label: tStoreForm("filterYear"),
              })}
              emptyLabel={tFormRoot("combobox.noResults")}
              inputClassName="w-full"
              showClear
              disabled={disabled}
              onLoadOptions={({ search: s }) =>
                Promise.resolve(carYearOptions(s))
              }
              resolveSelectedLabel={async (value) => value || null}
            />
            <Input
              type="search"
              value={oem}
              onChange={(e) => {
                setOem(e.target.value);
                setPage(1);
              }}
              placeholder={tFormRoot("placeholder.input", {
                label: tStoreForm("filterOem"),
              })}
              aria-label={tStoreForm("filterOem")}
              disabled={disabled}
            />
          </div>
        ) : null}
      </div>

      {selectedCount > 0 ? (
        <div className="flex justify-end">
          <Button type="button" size="lg" disabled={disabled} onClick={addSelected}>
            {tForm("addSelected")}
          </Button>
        </div>
      ) : null}

      {!requested ? (
        <StoreSalesProductBrowseEmpty />
      ) : (
        <>
          <StoreSalesProductBrowseTable
            rows={rows}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            selectedIds={selected}
            onToggleRow={(id, checked) =>
              setSelected((s) => ({ ...s, [id]: checked }))
            }
            onTogglePage={(checked) =>
              setSelected((s) => {
                const next = { ...s };
                for (const row of rows) {
                  if (checked) next[row.id] = true;
                  else delete next[row.id];
                }
                return next;
              })
            }
            onAdd={onAdd}
            cartQtyByItemId={cartQtyByItemId}
            onOpenCars={() => undefined}
            onOpenWarehouse={() => undefined}
            disabled={disabled}
            allowOutOfStock={allowOutOfStock}
          />
          <CrudPaginationBar
            page={safePage(total)}
            pageSize={pageSize}
            meta={{ total, totalPages: totalPages(total) }}
            onPageChange={setPage}
            onPageSizeChange={(size) =>
              onPageSizeChange(size as typeof pageSize)
            }
          />
        </>
      )}
    </>
  );
}
