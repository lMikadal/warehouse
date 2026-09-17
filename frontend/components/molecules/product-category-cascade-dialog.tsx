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
import { Link } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  breadcrumbLabel,
  childrenOf,
  columnCount,
  fetchAllActiveCategories,
  hasChildren,
  pathFromId,
  searchCategories,
} from "@/lib/product-category-cascade";
import type { ProductAttributeRow } from "@/lib/product-attribute-api";
import { cn } from "@/lib/utils";

export type ProductCategoryCascadeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valueId: number | null;
  onConfirm: (id: number, breadcrumb: string) => void;
  loadCategories?: (locale: DisplayLocale) => Promise<ProductAttributeRow[]>;
};

export function ProductCategoryCascadeDialog({
  open,
  onOpenChange,
  valueId,
  onConfirm,
  loadCategories = fetchAllActiveCategories,
}: ProductCategoryCascadeDialogProps) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tCrud = useTranslations("crud");
  const categoryPerms = useResourcePermissions("product", "product_category");
  const tSearch = useTranslations("search");
  const tError = useTranslations("error");

  const [rows, setRows] = useState<ProductAttributeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerPath, setPickerPath] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const startId = valueId;
    setSearchQuery("");
    setLoading(true);
    void loadCategories(locale)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setPickerPath(startId ? pathFromId(data, startId) : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, locale, loadCategories, valueId]);

  const searchHits = useMemo(
    () => searchCategories(rows, searchQuery),
    [rows, searchQuery]
  );

  const showSearch = searchQuery.trim().length >= 1;

  const previewBreadcrumb = useMemo(
    () => breadcrumbLabel(rows, pickerPath),
    [rows, pickerPath]
  );

  const handlePickId = useCallback(
    (id: number) => {
      const path = pathFromId(rows, id);
      setPickerPath(path);
      setSearchQuery("");
    },
    [rows]
  );

  const handleColumnPick = useCallback(
    (depth: number, id: number) => {
      setPickerPath((prev) => {
        const next = prev.slice(0, depth);
        next[depth] = id;
        return next;
      });
      setSearchQuery("");
    },
    []
  );

  const handleConfirm = () => {
    if (!pickerPath.length) return;
    const id = pickerPath[pickerPath.length - 1];
    onConfirm(id, breadcrumbLabel(rows, pickerPath));
    onOpenChange(false);
  };

  const numCols = columnCount(rows, pickerPath);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[min(72rem,96vw)]">
        <DialogHeader>
          <DialogTitle>{tForm("categoryDialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tSearch("placeholder")}
                autoComplete="off"
              />
              {!showSearch && searchQuery.trim().length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {tForm("categorySearchMinHint")}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right text-sm">
              <p className="text-muted-foreground text-xs">
                {tForm("categorySettingsHint")}
              </p>
              {categoryPerms.view ? (
                <Button variant="link" className="h-auto px-0 text-sm" asChild>
                  <Link href="/admin/product/category">
                    {tList("viewMoreDetails")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="min-h-80 overflow-hidden rounded-lg border border-border bg-background">
            {loading ? (
              <div className="flex gap-2 p-3">
                <Skeleton className="h-72 w-44 shrink-0" />
                <Skeleton className="h-72 w-44 shrink-0" />
              </div>
            ) : showSearch ? (
              <div className="max-h-80 overflow-y-auto p-1">
                {searchHits.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-center text-sm">
                    {tError("noData")}
                  </p>
                ) : (
                  searchHits.map((row) => {
                    const path = pathFromId(rows, row.id);
                    const name = row.name;
                    const crumb = breadcrumbLabel(rows, path);
                    return (
                      <button
                        key={row.id}
                        type="button"
                        className="hover:bg-muted flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm"
                        onClick={() => handlePickId(row.id)}
                      >
                        <span className="font-medium">{name}</span>
                        {crumb && crumb !== name ? (
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
                {Array.from({ length: numCols }, (_, depth) => {
                  const parentId =
                    depth === 0 ? null : (pickerPath[depth - 1] ?? null);
                  if (depth > 0 && pickerPath[depth - 1] == null) return null;
                  const items = childrenOf(rows, parentId);
                  if (!items.length && depth > 0) return null;
                  const activeId = pickerPath[depth] ?? null;
                  return (
                    <div
                      key={depth}
                      className="flex max-h-80 min-w-44 max-w-56 flex-1 flex-col border-r border-border last:border-r-0"
                    >
                      {items.length === 0 ? (
                        <p className="text-muted-foreground p-4 text-center text-sm">
                          {tError("noData")}
                        </p>
                      ) : (
                        items.map((row) => {
                          const active = activeId === row.id;
                          const kids = hasChildren(rows, row.id);
                          return (
                            <button
                              key={row.id}
                              type="button"
                              className={cn(
                                "hover:bg-muted flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm",
                                active && "bg-muted text-primary font-medium"
                              )}
                              onClick={() => handleColumnPick(depth, row.id)}
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
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-sm">
            <span className="text-muted-foreground">
              {tForm("categoryCurrentSelection")}{" "}
            </span>
            <span>{previewBreadcrumb || "—"}</span>
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
            disabled={!pickerPath.length}
            onClick={handleConfirm}
          >
            {tCrud("btn.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
