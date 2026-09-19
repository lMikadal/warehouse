"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { FormField } from "@/components/molecules/form-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDate } from "@/lib/format-datetime";
import {
  createMemberUserDiscount,
  deleteMemberUserDiscount,
  MemberUserApiError,
  patchMemberUserDiscount,
  type MemberUserDiscountRow,
} from "@/lib/member-user-api";
import { loadMemberUserProductItemOptions } from "@/lib/member-user-filters-combobox";

type DiscountSubTab = "list" | "special" | "expired";

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isExpired(row: MemberUserDiscountRow, today: string): boolean {
  return !!(row.date_end && row.date_end < today);
}

export type MemberUserFormDiscountsTabProps = {
  userId: number;
  discounts: MemberUserDiscountRow[];
  canManage: boolean;
  onReload: () => void | Promise<void>;
};

export function MemberUserFormDiscountsTab({
  userId,
  discounts,
  canManage,
  onReload,
}: MemberUserFormDiscountsTabProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("memberUser");
  const tForm = useTranslations("form");
  const tCrud = useTranslations("crud");
  const tErr = useTranslations("error");
  const today = todayIsoDate();

  const [subTab, setSubTab] = useState<DiscountSubTab>("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productItemId, setProductItemId] = useState("");
  const [minimumQty, setMinimumQty] = useState("1");
  const [discount, setDiscount] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const base = discounts.filter((row) => {
      const exp = isExpired(row, today);
      if (subTab === "expired") return exp;
      if (exp) return false;
      if (subTab === "special") return row.minimum_qty > 1;
      return true;
    });
    return [...base].sort((a, b) => a.id - b.id);
  }, [discounts, subTab, today]);

  const resetDialog = () => {
    setEditingId(null);
    setProductItemId("");
    setMinimumQty("1");
    setDiscount("");
    setDateStart("");
    setDateEnd("");
  };

  const openCreate = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const openEdit = (row: MemberUserDiscountRow) => {
    setEditingId(row.id);
    setProductItemId(String(row.product_item_id));
    setMinimumQty(String(row.minimum_qty));
    setDiscount(String(row.discount));
    setDateStart(row.date_start?.slice(0, 10) ?? "");
    setDateEnd(row.date_end?.slice(0, 10) ?? "");
    setDialogOpen(true);
  };

  const saveDialog = async () => {
    if (!canManage) return;
    const pid = Number(productItemId);
    const disc = Number(discount);
    if (!pid || Number.isNaN(disc)) {
      toast.error(tErr("required"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        product_item_id: pid,
        minimum_qty: minimumQty.trim() ? Number(minimumQty) : 1,
        discount: disc,
        discount_type: "percent",
        date_start: dateStart.trim() || null,
        date_end: dateEnd.trim() || null,
        is_active: true,
      };
      if (editingId != null) {
        await patchMemberUserDiscount(locale, userId, editingId, body);
      } else {
        await createMemberUserDiscount(locale, userId, body);
      }
      toast.success(tCrud("toast.saved"));
      setDialogOpen(false);
      resetDialog();
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id: number) => {
    if (!canManage) return;
    setBusyId(id);
    try {
      await deleteMemberUserDiscount(locale, userId, id);
      toast.success(tCrud("toast.deleted"));
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <FormCard>
        <FormCardHeader>
          <FormCardTitle>{t("tabDiscounts")}</FormCardTitle>
        </FormCardHeader>
        <FormCardContent className="flex flex-col gap-4">
          <Tabs
            value={subTab}
            onValueChange={(v) => setSubTab(v as DiscountSubTab)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList variant="line">
                <TabsTrigger value="list">{t("discountTabList")}</TabsTrigger>
                <TabsTrigger value="special">
                  {t("discountTabBulk")}
                </TabsTrigger>
                <TabsTrigger value="expired">
                  {t("discountTabExpired")}
                </TabsTrigger>
              </TabsList>
              {canManage && subTab !== "expired" ? (
                <Button type="button" size="sm" onClick={openCreate}>
                  <Plus className="size-4" aria-hidden />
                  {t("addProduct")}
                </Button>
              ) : null}
            </div>

            {(["list", "special", "expired"] as const).map((key) => (
              <TabsContent key={key} value={key} className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("productSku")}</TableHead>
                        <TableHead>{t("minQty")}</TableHead>
                        <TableHead className="text-right tabular-nums">
                          {t("discountPercent")}
                        </TableHead>
                        <TableHead>{t("startDate")}</TableHead>
                        <TableHead>{t("endDate")}</TableHead>
                        {canManage && key !== "expired" ? (
                          <TableHead className="w-24 text-center">
                            {tCrud("table.actions")}
                          </TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={canManage && key !== "expired" ? 6 : 5}
                            className="text-center text-muted-foreground"
                          >
                            {t("emptyData")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.product_item_id}</TableCell>
                            <TableCell className="tabular-nums">
                              {row.minimum_qty}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.discount}%
                            </TableCell>
                            <TableCell>
                              {row.date_start
                                ? formatDate(row.date_start, locale)
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {row.date_end
                                ? formatDate(row.date_end, locale)
                                : "—"}
                            </TableCell>
                            {canManage && key !== "expired" ? (
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={tCrud("btn.edit")}
                                    onClick={() => openEdit(row)}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    disabled={busyId === row.id}
                                    aria-label={tCrud("btn.delete")}
                                    onClick={() => void removeRow(row.id)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </FormCardContent>
      </FormCard>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId != null ? tCrud("btn.edit") : t("addProduct")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <RemoteComboboxField
              id="mu-discount-product"
              label={t("pickProduct")}
              value={productItemId}
              inputClassName="w-full"
              placeholder={tForm("placeholder.select", {
                label: t("productName"),
              })}
              emptyLabel={tForm("combobox.noResults")}
              disabled={!canManage || saving}
              onValueChange={setProductItemId}
              onLoadOptions={async ({ search }) => {
                const { options } = await loadMemberUserProductItemOptions(
                  locale,
                  search,
                  1,
                  productItemId ? Number(productItemId) : undefined
                );
                return options;
              }}
            />
            <FormField
              id="mu-discount-min-qty"
              labelKey="memberUser.minQty"
              type="number"
              value={minimumQty}
              onChange={setMinimumQty}
              readOnly={!canManage || saving}
            />
            <FormField
              id="mu-discount-percent"
              labelKey="memberUser.discountPercent"
              type="number"
              value={discount}
              onChange={setDiscount}
              readOnly={!canManage || saving}
            />
            <FormField
              id="mu-discount-start"
              labelKey="memberUser.startDate"
              type="date"
              value={dateStart}
              onChange={setDateStart}
              readOnly={!canManage || saving}
            />
            <FormField
              id="mu-discount-end"
              labelKey="memberUser.endDate"
              type="date"
              value={dateEnd}
              onChange={setDateEnd}
              readOnly={!canManage || saving}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={saving || !canManage}
              onClick={() => void saveDialog()}
            >
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
