"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MemberUserBrandCategoryFilterDialog } from "@/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-user-brand-category-filter-dialog";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PageSizeOption } from "@/lib/crud-pagination";
import type { DisplayLocale } from "@/lib/format-datetime";
import { fetchMemberUserProductItemFilters } from "@/lib/member-user-filters-api";

export type MemberUserDiscountProductPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (productItemIds: number[]) => void | Promise<void>;
  confirming?: boolean;
};

export function MemberUserDiscountProductPickerDialog({
  open,
  onOpenChange,
  onConfirm,
  confirming = false,
}: MemberUserDiscountProductPickerDialogProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("memberUser");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tErr = useTranslations("error");

  const [search, setSearch] = useState("");
  const [brandFilterId, setBrandFilterId] = useState<number | null>(null);
  const [categoryFilterId, setCategoryFilterId] = useState<number | null>(null);
  const [filterLabel, setFilterLabel] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof fetchMemberUserProductItemFilters>>["items"]
  >([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<number, true>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows, meta } = await fetchMemberUserProductItemFilters(
        locale,
        {
          page,
          limit: pageSize,
          search,
          brand_id: brandFilterId ?? undefined,
          category_id: categoryFilterId ?? undefined,
        }
      );
      setItems(rows);
      setTotal(meta?.total ?? rows.length);
    } finally {
      setLoading(false);
    }
  }, [locale, page, pageSize, search, brandFilterId, categoryFilterId]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- picker fetch when dialog opens
    void load();
  }, [open, load]);

  const pageIds = useMemo(() => items.map((r) => r.id), [items]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected[id]);

  const toggleAllPage = (checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of pageIds) {
        if (checked) next[id] = true;
        else delete next[id];
      }
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const clearBrandCategoryFilter = () => {
    setBrandFilterId(null);
    setCategoryFilterId(null);
    setFilterLabel("");
    setPage(1);
  };

  const filterPlaceholder = tCrud("filter.select", { label: tCol("brand") });

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setSearch("");
            clearBrandCategoryFilter();
            setFilterOpen(false);
            setPage(1);
            setPageSize(10);
            setSelected({});
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full flex-col gap-4 sm:max-w-[min(56rem,96vw)]">
          <DialogHeader>
            <DialogTitle>{t("pickProduct")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
            <Field className="w-48 shrink-0 gap-1.5">
              <FieldLabel htmlFor="mu-disc-pick-brand-filter">
                {tCol("brand")}
              </FieldLabel>
              <div className="relative">
                <Input
                  id="mu-disc-pick-brand-filter"
                  readOnly
                  className="cursor-pointer pr-9"
                  value={filterLabel}
                  placeholder={filterPlaceholder}
                  onClick={() => setFilterOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setFilterOpen(true);
                    }
                  }}
                  role="button"
                  aria-haspopup="dialog"
                />
                {brandFilterId != null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                    aria-label={tCrud("filter.all")}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearBrandCategoryFilter();
                    }}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            </Field>
            <CrudSearchField
              id="mu-disc-pick-search"
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              className="min-w-[12rem] flex-1"
            />
          </div>
          <p className="text-muted-foreground text-sm">
            {t("selectedCount", { count: Object.keys(selected).length })}
          </p>
          <div className="max-h-80 min-h-0 flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={(c) => toggleAllPage(c === true)}
                      aria-label={tCrud("table.actions")}
                    />
                  </TableHead>
                  <TableHead>{t("productName")}</TableHead>
                  <TableHead>{tCol("brand")}</TableHead>
                  <TableHead>{t("productSku")}</TableHead>
                  <TableHead className="text-right tabular-nums">
                    {t("purchaseAmount")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      {tCrud("loading")}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      {tErr("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!selected[row.id]}
                          onCheckedChange={(c) => {
                            setSelected((prev) => {
                              const next = { ...prev };
                              if (c === true) next[row.id] = true;
                              else delete next[row.id];
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>{row.product_name ?? row.name}</TableCell>
                      <TableCell>{row.brand_name?.trim() || "—"}</TableCell>
                      <TableCell>{row.sku?.trim() || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        0
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <CrudPaginationBar
            page={page}
            pageSize={pageSize}
            meta={{ total, totalPages }}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size as PageSizeOption);
              setPage(1);
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={confirming}
              onClick={() => onOpenChange(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={confirming || Object.keys(selected).length === 0}
              onClick={() =>
                void onConfirm(Object.keys(selected).map(Number))
              }
            >
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MemberUserBrandCategoryFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        brandId={brandFilterId}
        categoryId={categoryFilterId}
        onConfirm={({ brandId, categoryId, label }) => {
          setBrandFilterId(brandId);
          setCategoryFilterId(categoryId);
          setFilterLabel(label);
          setPage(1);
        }}
      />
    </>
  );
}
