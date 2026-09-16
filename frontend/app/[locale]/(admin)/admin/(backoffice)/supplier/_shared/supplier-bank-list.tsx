"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Hash, Landmark, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  reorderIdsFromSortableEvent,
  sortableIndicesFromSource,
} from "@/lib/crud-list-rows";
import { fetchSettingLangById } from "@/lib/setting-api";
import {
  reorderSupplierBanks,
  SupplierUserApiError,
  type SupplierBankRow,
} from "@/lib/supplier-user-api";
import { cn } from "@/lib/utils";

export type SupplierBankListRow = SupplierBankRow & { _draft?: true };

function accountInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2);
}

function withBankSortOrder(rows: SupplierBankListRow[]): SupplierBankListRow[] {
  return rows.map((row, index) => ({
    ...row,
    sort_order: (index + 1) * 100,
  }));
}

function sortBanks(rows: SupplierBankListRow[]): SupplierBankListRow[] {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id
  );
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
  const tCrud = useTranslations("crud");
  const t = useTranslations();

  const sorted = useMemo(() => sortBanks(banks), [banks]);
  const dragEnabled = canManage && sorted.length > 1;
  const [sortableEpoch, setSortableEpoch] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SupplierBankListRow | null>(
    null
  );
  const [bankLabels, setBankLabels] = useState<Map<number, string>>(
    () => new Map()
  );

  const bankIdsKey = useMemo(
    () =>
      [...new Set(sorted.map((b) => b.setting_bank_id))]
        .sort((a, b) => a - b)
        .join(","),
    [sorted]
  );

  useEffect(() => {
    const ids = bankIdsKey
      ? bankIdsKey.split(",").map((s) => Number(s))
      : [];
    if (ids.length === 0) {
      setBankLabels(new Map());
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

  const rowActions = (): TableIconActionKey[] =>
    [canManage && "edit", canDelete && "delete"].filter(
      Boolean
    ) as TableIconActionKey[];

  const handleDragEnd: ComponentProps<typeof DragDropProvider>["onDragEnd"] = (
    event
  ) => {
    if (event.canceled || !dragEnabled) return;
    const indices = sortableIndicesFromSource(event.operation?.source);
    if (!indices || indices.from === indices.to) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    const dragRow = sorted[indices.from];
    const targetRow = sorted[indices.to];
    if (!dragRow || !targetRow) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    const reordered = reorderIdsFromSortableEvent(sorted, event);
    if (!reordered) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    const next = withBankSortOrder(reordered);

    if (!isEdit || supplierId == null) {
      onBanksChange(next);
      return;
    }

    void reorderSupplierBanks(locale, supplierId, dragRow.id, targetRow.id)
      .then(() => {
        onBanksChange(next);
        onReload();
        toast.success(tCrud("toast.reordered"));
      })
      .catch((e: unknown) => {
        queueMicrotask(() => setSortableEpoch((n) => n + 1));
        toast.error(
          e instanceof SupplierUserApiError ? e.message : t("error.generic")
        );
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {tSupplier("banksTabDescription")}
        </p>
        {canManage ? (
          <Button type="button" size="lg" className="shrink-0" onClick={onAdd}>
            <Plus className="size-4" />
            {tSupplier("addBank")}
          </Button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {tSupplier("emptyBanks")}
        </div>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div
            key={dragEnabled ? sortableEpoch : "static"}
            className="flex flex-col gap-2"
          >
            {sorted.map((row, index) => (
              <SupplierBankSortableItem
                key={row.id}
                row={row}
                index={index}
                dragEnabled={dragEnabled}
                bankLabel={
                  bankLabels.get(row.setting_bank_id) ??
                  String(row.setting_bank_id)
                }
                actions={rowActions()}
                onEdit={() => onEdit(row)}
                onDelete={() => setDeleteTarget(row)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      <CrudDeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          const row = deleteTarget;
          setDeleteTarget(null);
          if (row) void onDelete(row);
        }}
      />
    </div>
  );
}

function SupplierBankSortableItem({
  row,
  index,
  dragEnabled,
  bankLabel,
  actions,
  onEdit,
  onDelete,
}: {
  row: SupplierBankListRow;
  index: number;
  dragEnabled: boolean;
  bankLabel: string;
  actions: TableIconActionKey[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
    disabled: !dragEnabled,
  });

  const branch = row.branch?.trim();

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 sm:flex-nowrap",
        isDragging && "opacity-50"
      )}
    >
      {dragEnabled ? (
        <button
          type="button"
          ref={handleRef}
          className="inline-flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={tCrud("reorder.drag")}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}

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

      {actions.length > 0 ? (
        <TableIconActions
          className="shrink-0"
          actions={actions}
          onAction={(action) => {
            if (action === "edit") onEdit();
            if (action === "delete") onDelete();
          }}
        />
      ) : null}
    </div>
  );
}
