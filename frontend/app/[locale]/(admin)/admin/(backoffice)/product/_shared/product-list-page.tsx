"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { Button } from "@/components/ui/button";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { Link } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  loadProductItemBrowseCategoryComboboxOptions,
  resolveProductItemBrowseCategoryLabel,
} from "@/lib/product-category-combobox";
import {
  loadProductBrandComboboxOptions,
  resolveProductBrandLabels,
} from "@/lib/product-brand-combobox";
import {
  deleteProductItem,
  fetchProductItems,
  patchProductItemActive,
  patchProductItemStopped,
  ProductListApiError,
  type ProductItemBrowseRow,
} from "@/lib/product-list-api";
import { cn } from "@/lib/utils";

import {
  ProductListCarModal,
  ProductListWarehouseModal,
} from "./product-list-modals";
import { ProductListSelectionBar } from "./product-list-selection-bar";
import { ProductListTable } from "./product-list-table";

type NewFilter = "" | "new";

export function ProductListPage() {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.productList");
  const tList = useTranslations("productList");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("product", "product_list");

  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [newFilter, setNewFilter] = useState<NewFilter>("");

  const filtersActive =
    categoryId !== "" || brandId !== "" || newFilter !== "";
  const listQuery = useCrudListQuery({ extraFiltered: filtersActive });
  const {
    query,
    onSearchChange,
    onStatusFilterChange,
    statusFilter,
    sortKey,
    sortDir,
    handleSortChange,
    page,
    pageSize,
    onPageSizeChange,
    setPage,
    debouncedQuery,
    isActiveFromStatus,
    sortParamsForFetch,
    listFiltered,
  } = listQuery;

  const [rows, setRows] = useState<ProductItemBrowseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteRow, setDeleteRow] = useState<ProductItemBrowseRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [carListId, setCarListId] = useState<number | null>(null);
  const [whItemId, setWhItemId] = useState<number | null>(null);

  const { sort, order } = sortParamsForFetch;

  const selectionEnabled = perms.delete || perms.update;
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectionResetKey = useMemo(
    () =>
      [
        page,
        pageSize,
        debouncedQuery,
        statusFilter,
        newFilter,
        categoryId,
        brandId,
        sort ?? "",
        order ?? "",
      ].join("|"),
    [
      page,
      pageSize,
      debouncedQuery,
      statusFilter,
      newFilter,
      categoryId,
      brandId,
      sort,
      order,
    ]
  );
  const prevSelectionResetKey = useRef(selectionResetKey);
  useEffect(() => {
    if (prevSelectionResetKey.current !== selectionResetKey) {
      prevSelectionResetKey.current = selectionResetKey;
      clearSelection();
    }
  }, [selectionResetKey, clearSelection]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProductItems(locale, {
        page,
        limit: pageSize,
        search: debouncedQuery.trim() || undefined,
        isActive: isActiveFromStatus,
        isNew: newFilter === "new" ? true : undefined,
        productCategoryId: categoryId ? Number(categoryId) : undefined,
        productBrandId: brandId ? Number(brandId) : undefined,
        sort: sort ?? undefined,
        order: order ?? undefined,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("noData")
      );
    } finally {
      setLoading(false);
    }
  }, [
    locale,
    page,
    pageSize,
    debouncedQuery,
    isActiveFromStatus,
    newFilter,
    categoryId,
    brandId,
    sort,
    order,
    tError,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const onToggleActive = async (row: ProductItemBrowseRow, active: boolean) => {
    try {
      await patchProductItemActive(row.id, active);
      toast.success(tCrud("toast.saved"));
      void load();
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("noData")
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      await deleteProductItem(deleteRow.id);
      toast.success(tCrud("toast.deleted"));
      setDeleteRow(null);
      void load();
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("noData")
      );
    }
  };

  const selectedIdList = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  );
  const pageRowIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedOnPageCount = pageRowIds.filter((id) =>
    selectedIds.has(id)
  ).length;
  const pageAllSelected =
    pageRowIds.length > 0 && selectedOnPageCount === pageRowIds.length;
  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const togglePage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageRowIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const selectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageRowIds) next.add(id);
      return next;
    });
  };

  const runBulk = async (fn: (id: number) => Promise<void>) => {
    if (selectedIdList.length === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(selectedIdList.map((id) => fn(id)));
      toast.success(tCrud("toast.saved"));
      clearSelection();
      void load();
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("noData")
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIdList.length === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(selectedIdList.map((id) => deleteProductItem(id)));
      toast.success(tCrud("toast.deleted"));
      setBulkDeleteOpen(false);
      clearSelection();
      void load();
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("noData")
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const selectionBarVisible = selectionEnabled && selectedIds.size > 0;

  const categoryLabel = useMemo(
    () => tList("filterProductCategory"),
    [tList]
  );
  const brandLabel = useMemo(() => tList("filterProductBrand"), [tList]);

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        selectionBarVisible && "pb-20"
      )}
    >
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("desc")}
        actions={
          perms.create ? (
            <Button asChild size="lg">
              <Link href="/admin/product/list/new">
                <Plus className="size-4" />
                {tList("addProductCta")}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <CrudSearchField value={query} onChange={onSearchChange} className="min-w-[12rem] flex-1" />
          <RemoteComboboxField
            label={categoryLabel}
            value={categoryId}
            onValueChange={(v) => {
              setCategoryId(v);
              setPage(1);
            }}
            placeholder={tCrud("filter.select", { label: categoryLabel })}
            emptyLabel={tError("noData")}
            inputClassName="w-full min-w-[10rem] sm:w-48"
            showClear
            onLoadOptions={(ctx) =>
              loadProductItemBrowseCategoryComboboxOptions(locale, {
                search: ctx.search,
                signal: ctx.signal,
              })
            }
            resolveSelectedLabel={(value) =>
              resolveProductItemBrowseCategoryLabel(locale, value)
            }
          />
          <RemoteComboboxField
            label={brandLabel}
            value={brandId}
            onValueChange={(v) => {
              setBrandId(v);
              setPage(1);
            }}
            placeholder={tCrud("filter.select", { label: brandLabel })}
            emptyLabel={tError("noData")}
            inputClassName="w-full min-w-[10rem] sm:w-48"
            showClear
            onLoadOptions={(ctx) =>
              loadProductBrandComboboxOptions(locale, {
                search: ctx.search,
                signal: ctx.signal,
                source: "itemBrowse",
              })
            }
            resolveSelectedLabel={async (value) => {
              const opts = await resolveProductBrandLabels(locale, [value], "itemBrowse");
              return opts[0]?.label ?? null;
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {tList("filterStatusPlaceholder")}
            </span>
            <StatusFilterGroup
              value={statusFilter}
              onChange={(v) => {
                onStatusFilterChange(v);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {tList("filterNewProductPlaceholder")}
            </span>
            <div
              role="group"
              className="inline-flex overflow-hidden rounded-lg border border-border"
            >
              {(
                [
                  { value: "" as NewFilter, label: tCrud("filter.all") },
                  { value: "new" as NewFilter, label: tList("newProductFilterOnly") },
                ] as const
              ).map((opt, index) => (
                <Button
                  key={opt.value || "all"}
                  type="button"
                  variant="ghost"
                  size="lg"
                  aria-pressed={newFilter === opt.value}
                  className={cn(
                    "rounded-none border-0 px-3 shadow-none",
                    index > 0 && "border-l border-border",
                    newFilter === opt.value &&
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                  onClick={() => {
                    setNewFilter(opt.value);
                    setPage(1);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ProductListTable
        rows={rows}
        loading={loading}
        sortKey={sortKey}
        sortDir={sortDir}
        listFiltered={listFiltered}
        onSortChange={handleSortChange}
        canUpdate={perms.update}
        canDelete={perms.delete}
        onToggleActive={onToggleActive}
        onDelete={setDeleteRow}
        onOpenCars={setCarListId}
        onOpenWarehouse={setWhItemId}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onTogglePage={togglePage}
      />

      {selectionBarVisible ? (
        <ProductListSelectionBar
          selectedCount={selectedIds.size}
          pageRowCount={pageRowIds.length}
          pageAllSelected={pageAllSelected}
          canDelete={perms.delete}
          canUpdate={perms.update}
          busy={bulkBusy}
          onTogglePage={togglePage}
          onDeselect={clearSelection}
          onSelectAllPage={selectAllPage}
          onBulkDelete={() => setBulkDeleteOpen(true)}
          onBulkDisableSales={() =>
            void runBulk((id) => patchProductItemStopped(id, true))
          }
          onBulkEnableSales={() =>
            void runBulk((id) => patchProductItemStopped(id, false))
          }
        />
      ) : null}

      <CrudPaginationBar
        page={safePage}
        pageSize={pageSize}
        meta={{ total, totalPages }}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
      />

      <ProductListCarModal
        listId={carListId}
        open={carListId != null}
        onOpenChange={(open) => !open && setCarListId(null)}
      />
      <ProductListWarehouseModal
        itemId={whItemId}
        open={whItemId != null}
        onOpenChange={(open) => !open && setWhItemId(null)}
      />

      <CrudDeleteConfirmDialog
        open={deleteRow != null}
        onOpenChange={(open) => !open && setDeleteRow(null)}
        onConfirm={() => void confirmDelete()}
        title={tCrud("btn.delete")}
        description={
          deleteRow
            ? tList("deleteConfirm", { name: deleteRow.name })
            : ""
        }
      />

      <CrudDeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
        title={tCrud("btn.delete")}
        description={tList("bulkDeleteConfirm", {
          count: selectedIdList.length,
        })}
      />
    </div>
  );
}
