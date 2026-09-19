"use client";

import { Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { FormCard, FormCardContent } from "@/components/molecules/form-card";
import { FormField } from "@/components/molecules/form-field";
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
import { DatePicker, type DateRangeValue } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PageSizeOption } from "@/lib/crud-pagination";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDate } from "@/lib/format-datetime";
import {
  createMemberUserDiscount,
  deleteMemberUserDiscount,
  MemberUserApiError,
  patchMemberUserDiscount,
  type MemberUserDiscountRow,
} from "@/lib/member-user-api";
import {
  fetchMemberUserProductItemFilters,
  type MemberUserProductItemFilterItem,
} from "@/lib/member-user-filters-api";
import { loadMemberUserProductBrandOptions } from "@/lib/member-user-filters-combobox";
import {
  creditTabsFromSelection,
  type RemoteOption,
} from "@/lib/member-user-relations";
import { cn } from "@/lib/utils";

import { MemberUserDiscountProductPickerDialog } from "./member-user-discount-product-picker-dialog";
import {
  bulkDraftFromRow,
  calcSpecial,
  discountRowOverlapsFilterRange,
  formatBaht,
  isExpiredRow,
  productDisplayFromFilter,
  todayIsoDate,
  type BulkDraftFields,
} from "./member-user-discount-utils";

type DiscountSubTab = "list" | "bulk" | "expired";

function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    meta: { total, totalPages, page: p },
  };
}

export type MemberUserFormDiscountsTabProps = {
  userId: number;
  discounts: MemberUserDiscountRow[];
  creditIds: string[];
  creditOptions: RemoteOption[];
  canManage: boolean;
  onReload: () => void | Promise<void>;
};

export function MemberUserFormDiscountsTab({
  userId,
  discounts,
  creditIds,
  creditOptions,
  canManage,
  onReload,
}: MemberUserFormDiscountsTabProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("memberUser");
  const tCol = useTranslations("col");
  const tForm = useTranslations("form");
  const tCrud = useTranslations("crud");
  const tErr = useTranslations("error");
  const today = todayIsoDate();

  const [subTab, setSubTab] = useState<DiscountSubTab>("list");
  const [discountCreditId, setDiscountCreditId] = useState("");
  const [discountQuery, setDiscountQuery] = useState("");
  const [discountBrandId, setDiscountBrandId] = useState("");
  const [discountDateRange, setDiscountDateRange] = useState<
    DateRangeValue | undefined
  >(undefined);
  const [discountPage, setDiscountPage] = useState(1);
  const [discountPageSize, setDiscountPageSize] =
    useState<PageSizeOption>(10);

  const [bulkDiscountRowIds, setBulkDiscountRowIds] = useState<number[]>([]);
  const [bulkDraft, setBulkDraft] = useState<Record<number, BulkDraftFields>>(
    {}
  );
  const [bulkChecked, setBulkChecked] = useState<Record<number, boolean>>({});

  const [productCache, setProductCache] = useState<
    Map<number, MemberUserProductItemFilterItem>
  >(new Map());

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MemberUserDiscountRow | null>(
    null
  );
  const [editMinQty, setEditMinQty] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [bulkApplyMin, setBulkApplyMin] = useState("");
  const [bulkApplyDisc, setBulkApplyDisc] = useState("");
  const [bulkApplyStart, setBulkApplyStart] = useState("");
  const [bulkApplyEnd, setBulkApplyEnd] = useState("");

  const creditTabs = useMemo(
    () => creditTabsFromSelection(creditIds, creditOptions),
    [creditIds, creditOptions]
  );

  const activeCreditId = useMemo(() => {
    if (!creditTabs.length) return "";
    if (discountCreditId && creditTabs.some((c) => c.value === discountCreditId)) {
      return discountCreditId;
    }
    return creditTabs[0]?.value ?? "";
  }, [creditTabs, discountCreditId]);

  const filteredRows = useMemo(() => {
    const creditNum = Number(activeCreditId);
    let rows = discounts.filter((r) => {
      if (creditNum) {
        if (Number(r.member_credit_id) !== creditNum) return false;
      }
      const exp = isExpiredRow(r, today);
      if (subTab === "expired") return exp;
      if (exp) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => a.id - b.id);

    const q = discountQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const p = productCache.get(r.product_item_id);
        const disp = productDisplayFromFilter(p);
        return (
          disp.sku.toLowerCase().includes(q) ||
          disp.productName.toLowerCase().includes(q) ||
          disp.brandName.toLowerCase().includes(q)
        );
      });
    }
    if (discountBrandId) {
      const bid = Number(discountBrandId);
      rows = rows.filter((r) => productCache.get(r.product_item_id)?.brand_id === bid);
    }
    if (discountDateRange?.from || discountDateRange?.to) {
      rows = rows.filter((r) =>
        discountRowOverlapsFilterRange(
          r,
          discountDateRange.from,
          discountDateRange.to
        )
      );
    }
    const bulkSet = new Set(bulkDiscountRowIds);
    if (subTab === "list") {
      rows = rows.filter((r) => !bulkSet.has(r.id));
    } else if (subTab === "bulk") {
      rows = rows.filter((r) => bulkSet.has(r.id));
    }
    return rows;
  }, [
    discounts,
    activeCreditId,
    subTab,
    today,
    discountQuery,
    discountBrandId,
    discountDateRange,
    bulkDiscountRowIds,
    productCache,
  ]);

  const sliced = useMemo(
    () => paginate(filteredRows, discountPage, discountPageSize),
    [filteredRows, discountPage, discountPageSize]
  );

  useEffect(() => {
    const ids = [...new Set(sliced.rows.map((r) => r.product_item_id))];
    const missing = ids.filter((id) => !productCache.has(id));
    if (!missing.length) return;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const { items } = await fetchMemberUserProductItemFilters(locale, {
              id,
              page: 1,
              limit: 1,
            });
            return [id, items[0]] as const;
          } catch {
            return [id, undefined] as const;
          }
        })
      );
      if (cancelled) return;
      setProductCache((p) => {
        const next = new Map(p);
        for (const [id, item] of entries) {
          if (item) next.set(id, item);
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [sliced.rows, locale, productCache]);

  const usesBulkEditor = subTab === "bulk" || subTab === "expired";
  const showDiscTools = subTab !== "expired";
  const showBulkBar =
    (subTab === "bulk" && bulkDiscountRowIds.length > 0) ||
    (subTab === "expired" && filteredRows.length > 0);

  const openEdit = (row: MemberUserDiscountRow) => {
    setEditingRow(row);
    setEditMinQty(String(row.minimum_qty ?? 0));
    setEditDiscount(String(row.discount ?? 0));
    setEditStart(row.date_start?.slice(0, 10) ?? "");
    setEditEnd(row.date_end?.slice(0, 10) ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!canManage || !editingRow) return;
    setSaving(true);
    try {
      await patchMemberUserDiscount(locale, userId, editingRow.id, {
        member_credit_id:
          editingRow.member_credit_id ?? Number(activeCreditId),
        product_item_id: editingRow.product_item_id,
        minimum_qty: Number(editMinQty) || 0,
        discount: Number(editDiscount) || 0,
        discount_type: "percent",
        date_start: editStart.trim() || null,
        date_end: editEnd.trim() || null,
        is_active: true,
      });
      toast.success(tCrud("toast.saved"));
      setEditOpen(false);
      setEditingRow(null);
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
      setBulkDiscountRowIds((prev) => prev.filter((x) => x !== id));
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setBusyId(null);
      setDeleteId(null);
    }
  };

  const draftForRow = (row: MemberUserDiscountRow): BulkDraftFields =>
    bulkDraft[row.id] ?? bulkDraftFromRow(row);

  const setDraftField = (
    rowId: number,
    row: MemberUserDiscountRow,
    field: keyof BulkDraftFields,
    value: string
  ) => {
    setBulkDraft((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? bulkDraftFromRow(row)),
        [field]: value,
      },
    }));
  };

  const saveBulkRow = async (row: MemberUserDiscountRow) => {
    if (!canManage) return;
    const d = draftForRow(row);
    setBusyId(row.id);
    try {
      await patchMemberUserDiscount(locale, userId, row.id, {
        member_credit_id: row.member_credit_id ?? Number(activeCreditId),
        product_item_id: row.product_item_id,
        minimum_qty: Number(d.minimum_qty) || 0,
        discount: Number(d.discount) || 0,
        discount_type: "percent",
        date_start: d.date_start.trim() || null,
        date_end: d.date_end.trim() || null,
        is_active: true,
      });
      setBulkDraft((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      toast.success(tCrud("toast.saved"));
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setBusyId(null);
    }
  };

  const applyBulkToChecked = async () => {
    if (!canManage) return;
    const ids = Object.keys(bulkChecked)
      .filter((k) => bulkChecked[Number(k)])
      .map(Number);
    if (!ids.length) {
      toast.info(t("applyBulkNone"));
      return;
    }
    setSaving(true);
    try {
      for (const id of ids) {
        const row = discounts.find((r) => r.id === id);
        if (!row) continue;
        const patch: Parameters<typeof patchMemberUserDiscount>[3] = {
          member_credit_id: row.member_credit_id ?? Number(activeCreditId),
          product_item_id: row.product_item_id,
          discount_type: "percent",
          discount: row.discount,
          minimum_qty: row.minimum_qty,
          date_start: row.date_start ?? null,
          date_end: row.date_end ?? null,
          is_active: true,
        };
        if (bulkApplyMin.trim() !== "") {
          patch.minimum_qty = Number(bulkApplyMin) || 0;
        }
        if (bulkApplyDisc.trim() !== "") {
          patch.discount = Number(bulkApplyDisc) || 0;
        }
        if (bulkApplyStart.trim()) patch.date_start = bulkApplyStart;
        if (bulkApplyEnd.trim()) patch.date_end = bulkApplyEnd;
        await patchMemberUserDiscount(locale, userId, id, patch);
      }
      setBulkChecked({});
      setBulkDraft({});
      if (subTab === "bulk") {
        setBulkDiscountRowIds((prev) =>
          prev.filter((id) => !ids.includes(id))
        );
        setSubTab("list");
      }
      toast.success(tCrud("toast.saved"));
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePickerConfirm = async (productIds: number[]) => {
    if (!creditIds.length) {
      toast.info(t("noCredits"));
      return;
    }
    setPickerBusy(true);
    try {
      const newBulkIds: number[] = [];
      for (const pid of productIds) {
        for (const creditId of creditIds) {
          const existing = discounts.find(
            (d) =>
              d.product_item_id === pid &&
              Number(d.member_credit_id) === Number(creditId)
          );
          if (existing) {
            newBulkIds.push(existing.id);
            continue;
          }
          const { id: createdId } = await createMemberUserDiscount(
            locale,
            userId,
            {
              member_credit_id: Number(creditId),
              product_item_id: pid,
              minimum_qty: 1,
              discount: 0,
              discount_type: "percent",
              date_start: today,
              date_end: null,
              is_active: true,
            }
          );
          newBulkIds.push(createdId);
        }
      }
      setBulkDiscountRowIds((prev) => {
        const set = new Set(prev);
        for (const id of newBulkIds) set.add(id);
        return [...set];
      });
      setSubTab("bulk");
      setDiscountPage(1);
      setPickerOpen(false);
      toast.success(tCrud("toast.created"));
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setPickerBusy(false);
    }
  };

  const pageRowIds = sliced.rows.map((r) => r.id);
  const allPageChecked =
    pageRowIds.length > 0 &&
    pageRowIds.every((id) => bulkChecked[id]);

  const tableHead = (
    <TableRow>
      {usesBulkEditor ? (
        <TableHead className="w-10 text-center">
          <Checkbox
            checked={allPageChecked}
            onCheckedChange={(c) => {
              setBulkChecked((prev) => {
                const next = { ...prev };
                for (const id of pageRowIds) {
                  if (c === true) next[id] = true;
                  else delete next[id];
                }
                return next;
              });
            }}
            aria-label={tCrud("table.actions")}
          />
        </TableHead>
      ) : null}
      <TableHead>{t("productSku")}</TableHead>
      <TableHead>{t("productName")}</TableHead>
      <TableHead>{tCol("brand")}</TableHead>
      <TableHead className="text-right tabular-nums">{t("minQty")}</TableHead>
      <TableHead className="text-right tabular-nums">
        {t("regularPrice")}
      </TableHead>
      <TableHead className="text-right tabular-nums">
        {t("discountPercent")}
      </TableHead>
      <TableHead className="text-right tabular-nums">
        {t("specialPrice")}
      </TableHead>
      <TableHead>{t("startDate")}</TableHead>
      <TableHead>{t("endDate")}</TableHead>
      {canManage && subTab !== "expired" ? (
        <TableHead className="w-24 text-center">{tCrud("table.actions")}</TableHead>
      ) : null}
    </TableRow>
  );

  const colSpan =
    9 +
    (usesBulkEditor ? 1 : 0) +
    (canManage && subTab !== "expired" ? 1 : 0);

  const tableBody = (
    <>
      {sliced.rows.length === 0 ? (
        <TableRow>
          <TableCell
            colSpan={colSpan}
            className="text-center text-muted-foreground"
          >
            {t("emptyData")}
          </TableCell>
        </TableRow>
      ) : (
        sliced.rows.map((row) => {
          const p = productCache.get(row.product_item_id);
          const disp = productDisplayFromFilter(p);
          const special = calcSpecial(
            disp.price,
            row.discount,
            row.discount_type || "percent"
          );
          const draft = draftForRow(row);
          const inlineSpecial = calcSpecial(
            disp.price,
            Number(draft.discount) || 0,
            "percent"
          );
          return (
            <TableRow key={row.id}>
              {usesBulkEditor ? (
                <TableCell className="text-center">
                  <Checkbox
                    checked={!!bulkChecked[row.id]}
                    onCheckedChange={(c) =>
                      setBulkChecked((prev) => ({
                        ...prev,
                        [row.id]: c === true,
                      }))
                    }
                  />
                </TableCell>
              ) : null}
              <TableCell>{disp.sku || "—"}</TableCell>
              <TableCell>{disp.productName || "—"}</TableCell>
              <TableCell>{disp.brandName}</TableCell>
              <TableCell className="text-right tabular-nums">
                {usesBulkEditor ? (
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    className="h-8 w-20 tabular-nums"
                    value={draft.minimum_qty}
                    readOnly={!canManage}
                    onChange={(e) =>
                      setDraftField(
                        row.id,
                        row,
                        "minimum_qty",
                        e.target.value
                      )
                    }
                  />
                ) : (
                  row.minimum_qty
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBaht(disp.price)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {usesBulkEditor ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-8 w-20 tabular-nums"
                      value={draft.discount}
                      readOnly={!canManage}
                      onChange={(e) =>
                        setDraftField(row.id, row, "discount", e.target.value)
                      }
                    />
                    <span aria-hidden="true">%</span>
                  </span>
                ) : (
                  `${row.discount}%`
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBaht(usesBulkEditor ? inlineSpecial : special)}
              </TableCell>
              <TableCell>
                {usesBulkEditor ? (
                  <Input
                    type="date"
                    className="h-8"
                    value={draft.date_start}
                    readOnly={!canManage}
                    onChange={(e) =>
                      setDraftField(row.id, row, "date_start", e.target.value)
                    }
                  />
                ) : row.date_start ? (
                  formatDate(row.date_start, locale)
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {usesBulkEditor ? (
                  <Input
                    type="date"
                    className="h-8"
                    value={draft.date_end}
                    readOnly={!canManage}
                    onChange={(e) =>
                      setDraftField(row.id, row, "date_end", e.target.value)
                    }
                  />
                ) : row.date_end ? (
                  formatDate(row.date_end, locale)
                ) : (
                  "—"
                )}
              </TableCell>
              {canManage && subTab !== "expired" ? (
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {usesBulkEditor ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busyId === row.id}
                          aria-label={tCrud("btn.save")}
                          onClick={() => void saveBulkRow(row)}
                        >
                          <Save className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("revertRow")}
                          onClick={() =>
                            setBulkDraft((prev) => {
                              const next = { ...prev };
                              delete next[row.id];
                              return next;
                            })
                          }
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
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
                          onClick={() => setDeleteId(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })
      )}
    </>
  );

  const tabPanel = (
    <div className="flex flex-col gap-4">
      {showDiscTools ? (
        <div className="flex flex-wrap items-center gap-2">
          <CrudSearchField
            id="mu-disc-search"
            value={discountQuery}
            onChange={(v) => {
              setDiscountQuery(v);
              setDiscountPage(1);
            }}
            placeholder={t("discountSearch")}
            className="min-w-[12rem] flex-1"
          />
          <RemoteComboboxField
            id="mu-disc-brand"
            label={tCol("brand")}
            value={discountBrandId}
            inputClassName="w-[min(100%,12rem)] shrink-0"
            placeholder={tCrud("filter.select", { label: tCol("brand") })}
            emptyLabel={tForm("combobox.noResults")}
            showClear
            onValueChange={(v) => {
              setDiscountBrandId(v);
              setDiscountPage(1);
            }}
            onLoadOptions={async ({ search }) => {
              const { options } = await loadMemberUserProductBrandOptions(
                locale,
                search,
                1,
                discountBrandId ? Number(discountBrandId) : undefined
              );
              return options;
            }}
          />
          <div className="w-[min(100%,14rem)] shrink-0">
            <DatePicker
              id="mu-disc-date-range"
              mode="range"
              value={discountDateRange}
              onChange={(next) => {
                setDiscountDateRange(next);
                setDiscountPage(1);
              }}
              placeholder={t("dateRangePlaceholder")}
              aria-label={t("dateRange")}
              confirmLabel={t("confirm")}
              cancelLabel={tCrud("btn.cancel")}
              className="w-full"
            />
          </div>
        </div>
      ) : null}

      {creditTabs.length > 0 ? (
        <div className="flex flex-wrap gap-1 border-b pb-2">
          {creditTabs.map((c) => (
            <Button
              key={c.value}
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-md",
                activeCreditId === c.value &&
                  "bg-primary/10 text-primary"
              )}
              onClick={() => {
                setDiscountCreditId(c.value);
                setDiscountPage(1);
              }}
            >
              {c.label}
            </Button>
          ))}
        </div>
      ) : null}

      {showBulkBar ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
          <FormField
            id="mu-bulk-min"
            labelKey="memberUser.minQty"
            type="number"
            value={bulkApplyMin}
            onChange={setBulkApplyMin}
            readOnly={!canManage || saving}
          />
          <FormField
            id="mu-bulk-disc"
            labelKey="memberUser.discountPercent"
            type="number"
            value={bulkApplyDisc}
            onChange={setBulkApplyDisc}
            readOnly={!canManage || saving}
          />
          <FormField
            id="mu-bulk-start"
            labelKey="memberUser.startDate"
            type="date"
            value={bulkApplyStart}
            onChange={setBulkApplyStart}
            readOnly={!canManage || saving}
          />
          <FormField
            id="mu-bulk-end"
            labelKey="memberUser.endDate"
            type="date"
            value={bulkApplyEnd}
            onChange={setBulkApplyEnd}
            readOnly={!canManage || saving}
          />
          <Button
            type="button"
            size="sm"
            disabled={!canManage || saving}
            onClick={() => void applyBulkToChecked()}
          >
            {t("applyBulk")}
          </Button>
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>{tableHead}</TableHeader>
          <TableBody>{tableBody}</TableBody>
        </Table>
      </div>

      <CrudPaginationBar
        page={sliced.meta.page}
        pageSize={discountPageSize}
        meta={{
          total: sliced.meta.total,
          totalPages: sliced.meta.totalPages,
        }}
        onPageChange={setDiscountPage}
        onPageSizeChange={(size) => {
          setDiscountPageSize(size as PageSizeOption);
          setDiscountPage(1);
        }}
      />
    </div>
  );

  return (
    <>
      <FormCard>
        <FormCardContent className="flex flex-col gap-4">
          <Tabs
            value={subTab}
            onValueChange={(v) => {
              setSubTab(v as DiscountSubTab);
              setDiscountPage(1);
            }}
          >
            <div className="flex w-full items-center justify-between gap-2 border-b border-border">
              <TabsList variant="line" className="w-auto flex-none border-b-0">
                <TabsTrigger value="list">{t("discountTabList")}</TabsTrigger>
                <TabsTrigger value="bulk">{t("discountTabBulk")}</TabsTrigger>
                <TabsTrigger value="expired">
                  {t("discountTabExpired")}
                </TabsTrigger>
              </TabsList>
              {canManage && showDiscTools ? (
                <Button
                  type="button"
                  size="lg"
                  className="mb-2 shrink-0"
                  onClick={() => setPickerOpen(true)}
                >
                  <Plus className="size-4" aria-hidden />
                  {t("addProduct")}
                </Button>
              ) : null}
            </div>

            {(["list", "bulk", "expired"] as const).map((key) => (
              <TabsContent key={key} value={key} className="mt-4">
                {tabPanel}
              </TabsContent>
            ))}
          </Tabs>
        </FormCardContent>
      </FormCard>

      <MemberUserDiscountProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        confirming={pickerBusy}
        onConfirm={handlePickerConfirm}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("discountPercent")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FormField
              id="mu-disc-min"
              labelKey="memberUser.minQty"
              type="number"
              value={editMinQty}
              onChange={setEditMinQty}
              readOnly={!canManage || saving}
            />
            <FormField
              id="mu-disc-val"
              labelKey="memberUser.discountPercent"
              type="number"
              value={editDiscount}
              onChange={setEditDiscount}
              readOnly={!canManage || saving}
            />
            <FormField
              id="mu-disc-start"
              labelKey="memberUser.startDate"
              type="date"
              value={editStart}
              onChange={setEditStart}
              readOnly={!canManage || saving}
            />
            <FormField
              id="mu-disc-end"
              labelKey="memberUser.endDate"
              type="date"
              value={editEnd}
              onChange={setEditEnd}
              readOnly={!canManage || saving}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={saving || !canManage}
              onClick={() => void saveEdit()}
            >
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => {
          if (deleteId != null) void removeRow(deleteId);
        }}
      />
    </>
  );
}
