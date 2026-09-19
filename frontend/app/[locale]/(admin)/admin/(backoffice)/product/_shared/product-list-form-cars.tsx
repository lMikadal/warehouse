"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { ProductCarCascadeDialog } from "@/components/molecules/product-car-cascade-dialog";
import { TableIconActions } from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/lib/crud-pagination";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchProductListCars,
  type CarFitmentRow,
  type ListCarBody,
} from "@/lib/product-list-api";
import type { ProductAttributeRow } from "@/lib/product-attribute-api";
import {
  fetchAllActiveCars,
  nameById,
} from "@/lib/product-car-cascade";

type Props = {
  locale: DisplayLocale;
  listId?: number;
  cars: ListCarBody[];
  onChange: (cars: ListCarBody[]) => void;
  readOnly?: boolean;
};

function formatYearRange(
  start: number | null | undefined,
  end: number | null | undefined
): string {
  if (start && end) return `${start}-${end}`;
  if (start) return String(start);
  if (end) return String(end);
  return "—";
}

function rowKey(row: ListCarBody, index: number): string {
  return row.id != null ? `id-${row.id}` : `new-${index}`;
}

export function ProductListFormCars({
  locale,
  listId,
  cars,
  onChange,
  readOnly = false,
}: Props) {
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tAttr = useTranslations("productAttr");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const [catalog, setCatalog] = useState<ProductAttributeRow[]>([]);
  const [viewRows, setViewRows] = useState<CarFitmentRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);

  useEffect(() => {
    if (!readOnly || listId == null || listId <= 0) return;
    let cancelled = false;
    void fetchProductListCars(locale, listId)
      .then((items) => {
        if (!cancelled) setViewRows(items);
      })
      .catch(() => {
        if (!cancelled) setViewRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, listId, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    void fetchAllActiveCars(locale)
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale, readOnly]);

  const resolveName = useCallback(
    (id: number | null | undefined) => nameById(catalog, id) || "—",
    [catalog]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (readOnly && viewRows.length > 0) {
      const rows = viewRows.map((row, index) => ({ view: row, index }));
      if (!q) return rows;
      return rows.filter(({ view }) => {
        const line = [view.brand_name, view.model_name, view.engine_name]
          .join(" ")
          .toLowerCase();
        return line.includes(q);
      });
    }
    if (!q) return cars.map((row, index) => ({ row, index, view: null as CarFitmentRow | null }));
    return cars
      .map((row, index) => ({ row, index, view: null as CarFitmentRow | null }))
      .filter(({ row }) => {
        const line = [
          resolveName(row.product_attribute_brand_id),
          resolveName(row.product_attribute_model_id),
          resolveName(row.product_attribute_engine_id),
        ]
          .join(" ")
          .toLowerCase();
        return line.includes(q);
      });
  }, [cars, search, resolveName, readOnly, viewRows]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const gearLabel = (gear: string | null | undefined) => {
    if (gear === "manual") return tList("gearManual");
    if (gear === "auto") return tList("gearAuto");
    return gear || "—";
  };

  const openAdd = () => {
    setEditKey(null);
    setDialogOpen(true);
  };

  const openEdit = (key: string) => {
    setEditKey(key);
    setDialogOpen(true);
  };

  const editInitial = useMemo((): ListCarBody | null => {
    if (editKey == null) return null;
    const hit = cars.find((row, index) => rowKey(row, index) === editKey);
    return hit ?? null;
  }, [cars, editKey]);

  const handleConfirm = (body: ListCarBody) => {
    if (editKey != null) {
      const next = cars.map((row, index) =>
        rowKey(row, index) === editKey ? { ...row, ...body } : row
      );
      onChange(next);
      toast.success(tForm("toastCarUpdated"));
    } else {
      onChange([...cars, body]);
      toast.success(tForm("toastCarAdded"));
    }
  };

  const handleDelete = (key: string) => {
    onChange(cars.filter((row, index) => rowKey(row, index) !== key));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField
          id="plf-car-search"
          value={search}
          onChange={setSearch}
          className="min-w-48 flex-1"
          placeholder={tForm("carTableSearchPlaceholder")}
        />
        {!readOnly ? (
          <Button
            type="button"
            size="lg"
            className="ml-auto shrink-0"
            onClick={openAdd}
          >
            <Plus className="size-4" />
            {tForm("addCar")}
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-(--radius-table-wrap) border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tAttr("carBrand")}</TableHead>
              <TableHead>{tAttr("carModel")}</TableHead>
              <TableHead>{tAttr("carLevel.engine")}</TableHead>
              <TableHead>{tList("colYear")}</TableHead>
              <TableHead>{tList("colGear")}</TableHead>
              <TableHead className="text-center">
                {tCrud("table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((entry) => {
                const { index } = entry;
                const row = "row" in entry && entry.row ? entry.row : cars[index];
                const view = "view" in entry ? entry.view : null;
                const key =
                  view?.id != null
                    ? `view-${view.id}`
                    : rowKey(row ?? { product_attribute_engine_id: 0 }, index);
                const displayRow = row ?? cars[index];
                if (!displayRow && !view) return null;
                return (
                  <TableRow key={key}>
                    <TableCell>
                      {view?.brand_name ??
                        resolveName(displayRow?.product_attribute_brand_id)}
                    </TableCell>
                    <TableCell>
                      {view?.model_name ??
                        resolveName(displayRow?.product_attribute_model_id)}
                    </TableCell>
                    <TableCell>
                      {view?.engine_name ??
                        resolveName(displayRow?.product_attribute_engine_id)}
                    </TableCell>
                    <TableCell>
                      {formatYearRange(
                        view?.year_start ?? displayRow?.year_start,
                        view?.year_end ?? displayRow?.year_end
                      )}
                    </TableCell>
                    <TableCell>
                      {gearLabel(view?.gear_type ?? displayRow?.gear_type)}
                    </TableCell>
                    <TableCell className="text-center">
                      {!readOnly ? (
                        <div className="inline-flex justify-center">
                          <TableIconActions
                            actions={["edit", "delete"]}
                            onAction={(action) => {
                              if (action === "edit") openEdit(key);
                              if (action === "delete") handleDelete(key);
                            }}
                          />
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CrudPaginationBar
        page={safePage}
        pageSize={pageSize}
        meta={{ total, totalPages }}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size as PageSizeOption);
          setPage(1);
        }}
      />

      <ProductCarCascadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editInitial}
        catalog={catalog}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
