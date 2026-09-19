"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { loadMemberUserProductBrandOptions } from "@/lib/member-user-filters-combobox";
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
  const tForm = useTranslations("form");
  const tErr = useTranslations("error");

  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("");
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
          brand_id: brandId ? Number(brandId) : undefined,
        }
      );
      setItems(rows);
      setTotal(meta?.total ?? rows.length);
    } finally {
      setLoading(false);
    }
  }, [locale, page, pageSize, search, brandId]);

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSearch("");
          setBrandId("");
          setPage(1);
          setPageSize(10);
          setSelected({});
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{t("pickProduct")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-2">
          <RemoteComboboxField
            id="mu-disc-pick-brand"
            label={tCol("brand")}
            value={brandId}
            inputClassName="w-48"
            placeholder={tCrud("filter.select", { label: tCol("brand") })}
            emptyLabel={tForm("combobox.noResults")}
            showClear
            onValueChange={(v) => {
              setBrandId(v);
              setPage(1);
            }}
            onLoadOptions={async ({ search: q }) => {
              const { options } = await loadMemberUserProductBrandOptions(
                locale,
                q,
                1,
                brandId ? Number(brandId) : undefined
              );
              return options;
            }}
          />
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
        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
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
                    <TableCell className="text-right tabular-nums">0</TableCell>
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
  );
}
