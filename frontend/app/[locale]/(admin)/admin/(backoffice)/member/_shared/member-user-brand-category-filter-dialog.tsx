"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { DisplayLocale } from "@/lib/format-datetime";
import type { ProductAttributeRow } from "@/lib/product-attribute-api";
import {
  breadcrumbLabel,
  childrenOfBrandCategory,
  columnCountBrandCategory,
  fetchAllActiveBrands,
  fetchBrandCategoriesForCascade,
  filterBrandsBySearch,
  hasChildren,
  pathFromId,
  searchCategories,
  selectionLabel,
} from "@/lib/member-user-brand-category-cascade";
import { cn } from "@/lib/utils";

export type MemberUserBrandCategoryFilterConfirm = {
  brandId: number;
  categoryId: number | null;
  label: string;
};

export type MemberUserBrandCategoryFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: number | null;
  categoryId: number | null;
  onConfirm: (value: MemberUserBrandCategoryFilterConfirm) => void;
};

export function MemberUserBrandCategoryFilterDialog({
  open,
  onOpenChange,
  brandId,
  categoryId,
  onConfirm,
}: MemberUserBrandCategoryFilterDialogProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("memberUser");
  const tCol = useTranslations("col");
  const tForm = useTranslations("productListForm");
  const tCrud = useTranslations("crud");
  const tSearch = useTranslations("search");
  const tErr = useTranslations("error");

  const [brands, setBrands] = useState<ProductAttributeRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<ProductAttributeRow[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [pickerBrandId, setPickerBrandId] = useState<number | null>(null);
  const [categoryPath, setCategoryPath] = useState<number[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset cascade when filter dialog opens
    setBrandSearch("");
    setCategorySearch("");
    setPickerBrandId(brandId);
    setCategoryPath([]);
    setBrandsLoading(true);
    void fetchAllActiveBrands(locale)
      .then((data) => {
        if (cancelled) return;
        setBrands(data);
      })
      .finally(() => {
        if (!cancelled) setBrandsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, locale, brandId, categoryId]);

  useEffect(() => {
    if (!open || !pickerBrandId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear categories when brand cleared
      setCategoryRows([]);
      setCategoryPath([]);
      return;
    }
    let cancelled = false;
    setCategoriesLoading(true);
    void fetchBrandCategoriesForCascade(locale, pickerBrandId)
      .then((rows) => {
        if (cancelled) return;
        setCategoryRows(rows);
        if (categoryId && brandId === pickerBrandId) {
          setCategoryPath(pathFromId(rows, categoryId));
        } else {
          setCategoryPath([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, locale, pickerBrandId, brandId, categoryId]);

  const brandItems = useMemo(
    () => filterBrandsBySearch(brands, brandSearch),
    [brands, brandSearch]
  );

  const brandName = useMemo(
    () => brands.find((b) => b.id === pickerBrandId)?.name ?? "",
    [brands, pickerBrandId]
  );

  const showCategorySearch =
    pickerBrandId != null && categorySearch.trim().length >= 1;

  const categorySearchHits = useMemo(
    () => searchCategories(categoryRows, categorySearch),
    [categoryRows, categorySearch]
  );

  const categoryCols = pickerBrandId
    ? 1 + columnCountBrandCategory(categoryRows, categoryPath)
    : 1;

  const previewLabel = useMemo(
    () => selectionLabel(brandName, categoryRows, categoryPath),
    [brandName, categoryRows, categoryPath]
  );

  const handleBrandPick = useCallback((id: number) => {
    setPickerBrandId(id);
    setCategoryPath([]);
    setCategorySearch("");
  }, []);

  const handleCategoryColumnPick = useCallback(
    (depth: number, id: number) => {
      setCategoryPath((prev) => {
        const next = prev.slice(0, depth);
        next[depth] = id;
        return next;
      });
      setCategorySearch("");
    },
    []
  );

  const handleCategorySearchPick = useCallback(
    (id: number) => {
      setCategoryPath(pathFromId(categoryRows, id));
      setCategorySearch("");
    },
    [categoryRows]
  );

  const handleConfirm = () => {
    if (!pickerBrandId) return;
    const catId = categoryPath.length
      ? categoryPath[categoryPath.length - 1]
      : null;
    onConfirm({
      brandId: pickerBrandId,
      categoryId: catId,
      label: selectionLabel(brandName, categoryRows, categoryPath),
    });
    onOpenChange(false);
  };

  const loading = brandsLoading || (pickerBrandId != null && categoriesLoading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[min(72rem,96vw)]">
        <DialogHeader>
          <DialogTitle>{t("filterBrandCategoryTitle")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <Input
                type="search"
                value={pickerBrandId ? categorySearch : brandSearch}
                onChange={(e) => {
                  const v = e.target.value;
                  if (pickerBrandId) setCategorySearch(v);
                  else setBrandSearch(v);
                }}
                placeholder={tSearch("placeholder")}
                autoComplete="off"
              />
              {!showCategorySearch &&
              (pickerBrandId ? categorySearch : brandSearch).trim().length ===
                0 ? (
                <p className="text-muted-foreground text-xs">
                  {tForm("categorySearchMinHint")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="min-h-80 overflow-hidden rounded-lg border border-border bg-background">
            {loading ? (
              <div className="flex gap-2 p-3">
                <Skeleton className="h-72 w-44 shrink-0" />
                <Skeleton className="h-72 w-44 shrink-0" />
              </div>
            ) : showCategorySearch ? (
              <div className="max-h-80 overflow-y-auto p-1">
                {categorySearchHits.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-center text-sm">
                    {tErr("noData")}
                  </p>
                ) : (
                  categorySearchHits.map((row) => {
                    const path = pathFromId(categoryRows, row.id);
                    const crumb = breadcrumbLabel(categoryRows, path);
                    return (
                      <button
                        key={row.id}
                        type="button"
                        className="hover:bg-muted flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm"
                        onClick={() => handleCategorySearchPick(row.id)}
                      >
                        <span className="font-medium">{row.name}</span>
                        {crumb && crumb !== row.name ? (
                          <span className="text-muted-foreground text-xs">
                            {crumb}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="flex max-h-80 overflow-x-auto">
                {Array.from({ length: categoryCols }, (_, colIndex) => {
                  if (colIndex === 0) {
                    return (
                      <div
                        key="brand"
                        className="flex max-h-80 min-w-44 max-w-56 flex-1 flex-col border-r border-border"
                      >
                        <div className="border-b border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium">
                          {tCol("brand")}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                          {brandItems.length === 0 ? (
                            <p className="text-muted-foreground p-4 text-center text-sm">
                              {tErr("noData")}
                            </p>
                          ) : (
                            brandItems.map((row) => {
                              const active = pickerBrandId === row.id;
                              return (
                                <button
                                  key={row.id}
                                  type="button"
                                  className={cn(
                                    "hover:bg-muted flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm",
                                    active &&
                                      "bg-muted text-primary font-medium"
                                  )}
                                  onClick={() => handleBrandPick(row.id)}
                                >
                                  <span className="min-w-0 truncate">
                                    {row.name}
                                  </span>
                                  <ChevronRight
                                    className="size-4 shrink-0 opacity-60"
                                    aria-hidden
                                  />
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  }

                  const depth = colIndex - 1;
                  if (!pickerBrandId) {
                    return (
                      <div
                        key={`cat-ph-${colIndex}`}
                        className="flex max-h-80 min-w-44 max-w-56 flex-1 flex-col border-r border-border last:border-r-0"
                      >
                        <div className="border-b border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium">
                          {tCol("category")}
                        </div>
                        <p className="text-muted-foreground p-4 text-center text-sm">
                          {t("filterPickBrandFirst")}
                        </p>
                      </div>
                    );
                  }

                  const parentId =
                    depth === 0 ? null : (categoryPath[depth - 1] ?? null);
                  if (depth > 0 && categoryPath[depth - 1] == null) {
                    return null;
                  }
                  const items = childrenOfBrandCategory(categoryRows, parentId);
                  if (!items.length && depth > 0) return null;
                  const activeId = categoryPath[depth] ?? null;

                  return (
                    <div
                      key={`cat-${depth}`}
                      className="flex max-h-80 min-w-44 max-w-56 flex-1 flex-col border-r border-border last:border-r-0"
                    >
                      <div className="border-b border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium">
                        {tCol("category")}
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {items.length === 0 ? (
                          <p className="text-muted-foreground p-4 text-center text-sm">
                            {tErr("noData")}
                          </p>
                        ) : (
                          items.map((row) => {
                            const active = activeId === row.id;
                            const kids = hasChildren(categoryRows, row.id);
                            return (
                              <button
                                key={row.id}
                                type="button"
                                className={cn(
                                  "hover:bg-muted flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm",
                                  active &&
                                    "bg-muted text-primary font-medium"
                                )}
                                onClick={() =>
                                  handleCategoryColumnPick(depth, row.id)
                                }
                              >
                                <span className="min-w-0 truncate">
                                  {row.name}
                                </span>
                                {kids ? (
                                  <ChevronRight
                                    className="size-4 shrink-0 opacity-60"
                                    aria-hidden
                                  />
                                ) : null}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-sm">
            <span className="text-muted-foreground">
              {tForm("categoryCurrentSelection")}{" "}
            </span>
            <span>{previewLabel || "—"}</span>
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            {tCrud("btn.cancel")}
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!pickerBrandId}
            onClick={handleConfirm}
          >
            {tCrud("btn.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
