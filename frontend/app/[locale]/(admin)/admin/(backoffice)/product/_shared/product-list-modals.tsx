"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { Button } from "@/components/ui/button";
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
import { Link } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchProductItemWarehousePlacements,
  fetchProductListCars,
  type CarFitmentRow,
  type WarehousePlacementRow,
} from "@/lib/product-list-api";

const PRODUCT_LIST_DETAIL_DIALOG_CLASS =
  "max-w-[min(64rem,calc(100vw-2rem))] w-full sm:max-w-[64rem]";

const CAR_COLUMN_COUNT = 5;
const WAREHOUSE_COLUMN_COUNT = 6;
const MODAL_SKELETON_ROWS = 4;

type CarModalProps = {
  listId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductListCarModal({ listId, open, onOpenChange }: CarModalProps) {
  const locale = useLocale() as DisplayLocale;
  const tList = useTranslations("productList");
  const tAttr = useTranslations("productAttr");
  const carPerms = useResourcePermissions("product", "product_car");
  const [rows, setRows] = useState<CarFitmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || listId == null) return;
    setRows([]);
    setLoading(true);
    void fetchProductListCars(locale, listId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [open, listId, locale]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={PRODUCT_LIST_DETAIL_DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>{tList("carModalTitle")}</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tAttr("carBrand")}</TableHead>
                <TableHead>{tAttr("carModel")}</TableHead>
                <TableHead>{tAttr("carLevel.engine")}</TableHead>
                <TableHead>{tList("colYear")}</TableHead>
                <TableHead>{tList("colGear")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <CrudListTableSkeleton
                  columnCount={CAR_COLUMN_COUNT}
                  rowCount={MODAL_SKELETON_ROWS}
                />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={CAR_COLUMN_COUNT}
                    className="text-muted-foreground text-center"
                  >
                    —
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.brand_name}</TableCell>
                    <TableCell>{r.model_name}</TableCell>
                    <TableCell>{r.engine_name}</TableCell>
                    <TableCell>
                      {r.year_start != null && r.year_end != null
                        ? `${r.year_start}-${r.year_end}`
                        : r.year_start ?? "—"}
                    </TableCell>
                    <TableCell>
                      {r.gear_type === "manual"
                        ? tList("gearManual")
                        : tList("gearAuto")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {carPerms.view ? (
          <DialogFooter className="justify-end sm:justify-end">
            <Button variant="link" className="h-auto px-0" asChild>
              <Link href="/admin/product/car">{tList("viewMoreDetails")}</Link>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type WhModalProps = {
  itemId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductListWarehouseModal({
  itemId,
  open,
  onOpenChange,
}: WhModalProps) {
  const locale = useLocale() as DisplayLocale;
  const tList = useTranslations("productList");
  const whPerms = useResourcePermissions("warehouse", "warehouse_list");
  const [rows, setRows] = useState<WarehousePlacementRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || itemId == null) return;
    setRows([]);
    setLoading(true);
    void fetchProductItemWarehousePlacements(locale, itemId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [open, itemId, locale]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={PRODUCT_LIST_DETAIL_DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle>{tList("wpDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tList("wpLabelWarehouse")}</TableHead>
                <TableHead>{tList("wpLabelZone")}</TableHead>
                <TableHead>{tList("wpLabelShelf")}</TableHead>
                <TableHead>{tList("wpLabelRack")}</TableHead>
                <TableHead>{tList("wpLabelBin")}</TableHead>
                <TableHead className="text-right tabular-nums">
                  {tList("wpLabelQty")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <CrudListTableSkeleton
                  columnCount={WAREHOUSE_COLUMN_COUNT}
                  rowCount={MODAL_SKELETON_ROWS}
                />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={WAREHOUSE_COLUMN_COUNT}
                    className="text-muted-foreground text-center"
                  >
                    {tList("wpEmpty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.warehouse_name}</TableCell>
                    <TableCell>{r.zone_name}</TableCell>
                    <TableCell>{r.shelf_name}</TableCell>
                    <TableCell>{r.rack_name}</TableCell>
                    <TableCell>{r.bin_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.quantity}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {whPerms.view ? (
          <DialogFooter className="justify-end sm:justify-end">
            <Button variant="link" className="h-auto px-0" asChild>
              <Link href="/admin/warehouse/list">{tList("viewMoreDetails")}</Link>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
