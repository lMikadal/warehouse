"use client";

import { Hash, Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  CrudNestedSortableList,
  CrudNestedSortableListItem,
} from "@/components/molecules/crud-nested-sortable-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fetchSettingLangById } from "@/lib/setting-api";
import {
  reorderSupplierBanks,
  SupplierUserApiError,
  type SupplierBankRow,
} from "@/lib/supplier-user-api";

export type SupplierBankListRow = SupplierBankRow & { _draft?: true };

function accountInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2);
}

type SupplierBankListProps = {
  banks: SupplierBankListRow[];
  isEdit: boolean;
  locale: string;
  supplierId?: number;
  canManage: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onEdit: (row: SupplierBankListRow) => void;
  onDelete: (row: SupplierBankListRow) => void;
  onBanksChange: (next: SupplierBankListRow[]) => void;
  onReload: () => void;
};

export function SupplierBankList({
  banks,
  isEdit,
  locale,
  supplierId,
  canManage,
  canDelete,
  onAdd,
  onEdit,
  onDelete,
  onBanksChange,
  onReload,
}: SupplierBankListProps) {
  const tSupplier = useTranslations("supplier");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const t = useTranslations();

  const sorted = useMemo(
    () => [...banks].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [banks]
  );

  const bankIdsKey = useMemo(
    () =>
      [...new Set(sorted.map((b) => b.setting_bank_id))]
        .sort((a, b) => a - b)
        .join(","),
    [sorted]
  );

  const [bankLabels, setBankLabels] = useState<Map<number, string>>(
    () => new Map()
  );

  useEffect(() => {
    const ids = bankIdsKey
      ? bankIdsKey.split(",").map((s) => Number(s))
      : [];
    if (ids.length === 0) {
      queueMicrotask(() => setBankLabels(new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const item = await fetchSettingLangById(locale, "banks", id);
            return [id, item.name] as const;
          } catch {
            return [id, String(id)] as const;
          }
        })
      );
      if (cancelled) return;
      setBankLabels(new Map(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [bankIdsKey, locale]);

  const persistReorder =
    isEdit && supplierId != null
      ? (dragId: number, targetId: number) =>
          reorderSupplierBanks(locale, supplierId, dragId, targetId)
      : undefined;

  return (
    <CrudNestedSortableList
      rows={banks}
      dragEnabled={canManage}
      description={tSupplier("banksTabDescription")}
      emptyLabel={tSupplier("emptyBanks")}
      addLabel={tSupplier("addBank")}
      canManage={canManage}
      canDelete={canDelete}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      onRowsChange={onBanksChange}
      persistReorder={persistReorder}
      onReorderSuccess={() => {
        if (isEdit && supplierId != null) {
          onReload();
        }
        toast.success(tCrud("toast.reordered"));
      }}
      onReorderError={(e) => {
        toast.error(
          e instanceof SupplierUserApiError ? e.message : t("error.generic")
        );
      }}
      renderItem={({ row, index, dragEnabled: rowDrag, actions, onEdit: edit, onDelete }) => {
        const bankLabel =
          bankLabels.get(row.setting_bank_id) ?? String(row.setting_bank_id);
        const branch = row.branch?.trim();

        return (
          <CrudNestedSortableListItem
            key={row.id}
            id={row.id}
            index={index}
            dragEnabled={rowDrag}
            actions={actions}
            onEdit={edit}
            onDelete={onDelete}
          >
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                {accountInitials(row.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-medium">
                <span>{row.name}</span>
                {row.is_default ? (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {tCol("default")}
                  </Badge>
                ) : null}
                {!row.is_active ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({tCol("inactive")})
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Hash className="size-3.5 shrink-0" aria-hidden />
                  {row.number}
                </span>
                <span className="text-border" aria-hidden>
                  |
                </span>
                <span className="inline-flex items-center gap-1">
                  <Landmark className="size-3.5 shrink-0" aria-hidden />
                  {bankLabel}
                </span>
                {branch ? (
                  <>
                    <span className="text-border" aria-hidden>
                      |
                    </span>
                    <span>{branch}</span>
                  </>
                ) : null}
              </div>
            </div>
          </CrudNestedSortableListItem>
        );
      }}
    />
  );
}
