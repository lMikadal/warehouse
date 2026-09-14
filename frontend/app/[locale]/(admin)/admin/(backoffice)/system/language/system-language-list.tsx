"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSortHead,
  type TableSortDirection,
} from "@/components/ui/table";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { sortableIndicesFromSource } from "@/lib/crud-list-rows";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  createSystemLanguage,
  deleteSystemLanguage,
  fetchSystemLanguages,
  patchSystemLanguage,
  reorderSystemLanguages,
  SystemLanguageApiError,
  type SystemLanguageRow,
} from "@/lib/system-language-api";
import { cn } from "@/lib/utils";

import {
  SystemLanguageEditSheet,
  type SystemLanguageEditPayload,
  type SystemLanguageSheetState,
} from "./system-language-edit-sheet";

const COLUMN_COUNT = 7;

type ColSortKey = "locale" | "name" | "status" | "default" | "updatedAt";

function sortApiKey(col: ColSortKey): string {
  switch (col) {
    case "status":
      return "is_active";
    case "default":
      return "is_default";
    case "updatedAt":
      return "updated_at";
    default:
      return col;
  }
}

function sortFieldLabel(
  tCrud: ReturnType<typeof useTranslations<"crud">>,
  tCol: ReturnType<typeof useTranslations<"col">>,
  sortKey: string | null,
  sortDir: TableSortDirection | null,
  fieldKey: ColSortKey
): string {
  const colKey =
    fieldKey === "status"
      ? "status"
      : fieldKey === "default"
        ? "default"
        : fieldKey === "updatedAt"
          ? "updatedAt"
          : fieldKey;
  const field = tCol(colKey);
  if (sortKey !== sortApiKey(fieldKey) || !sortDir) {
    return tCrud("sort.none", { field });
  }
  return sortDir === "desc"
    ? tCrud("sort.desc", { field })
    : tCrud("sort.asc", { field });
}

function LanguageTableCells({
  row,
  locale,
  dragEnabled,
  handleRef,
  onToggleActive,
  onToggleDefault,
  onAction,
}: {
  row: SystemLanguageRow;
  locale: DisplayLocale;
  dragEnabled: boolean;
  handleRef?: (element: Element | null) => void;
  onToggleActive: (id: number, active: boolean) => void;
  onToggleDefault: (id: number, isDefault: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
}) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");

  return (
    <>
      <TableCell className="w-10 text-center">
        <ButtonIcon
          type="button"
          size="md"
          variant="ghost"
          className={cn(
            "cursor-grab active:cursor-grabbing",
            !dragEnabled && "pointer-events-none opacity-40"
          )}
          ref={handleRef}
          disabled={!dragEnabled}
          aria-label={tCrud("reorder.drag")}
        >
          <GripVertical className="text-current" />
        </ButtonIcon>
      </TableCell>
      <TableCell>{row.locale}</TableCell>
      <TableCell>{row.name}</TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <StatusSwitchField
            checked={row.is_active}
            disabled={row.is_default}
            onCheckedChange={(checked) => onToggleActive(row.id, checked)}
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <Switch
            checked={row.is_default}
            onCheckedChange={(checked) =>
              onToggleDefault(row.id, checked === true)
            }
            aria-label={tCol("default")}
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        {formatDateTime(row.updated_at, locale)}
      </TableCell>
      <TableCell className="text-center">
        <TableIconActions
          actions={["edit", "delete"]}
          onAction={(action) => onAction(row.id, action)}
        />
      </TableCell>
    </>
  );
}

function SortableLanguageRow({
  row,
  index,
  locale,
  dragEnabled,
  onToggleActive,
  onToggleDefault,
  onAction,
}: {
  row: SystemLanguageRow;
  index: number;
  locale: DisplayLocale;
  dragEnabled: boolean;
  onToggleActive: (id: number, active: boolean) => void;
  onToggleDefault: (id: number, isDefault: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
    disabled: !dragEnabled,
  });

  return (
    <TableRow ref={ref} className={cn(isDragging && "opacity-50")}>
      <LanguageTableCells
        row={row}
        locale={locale}
        dragEnabled={dragEnabled}
        handleRef={handleRef}
        onToggleActive={onToggleActive}
        onToggleDefault={onToggleDefault}
        onAction={onAction}
      />
    </TableRow>
  );
}

function StaticLanguageRow({
  row,
  locale,
  onToggleActive,
  onToggleDefault,
  onAction,
}: {
  row: SystemLanguageRow;
  locale: DisplayLocale;
  onToggleActive: (id: number, active: boolean) => void;
  onToggleDefault: (id: number, isDefault: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
}) {
  return (
    <TableRow>
      <LanguageTableCells
        row={row}
        locale={locale}
        dragEnabled={false}
        onToggleActive={onToggleActive}
        onToggleDefault={onToggleDefault}
        onAction={onAction}
      />
    </TableRow>
  );
}

export function SystemLanguageList() {
  const locale = useLocale() as DisplayLocale;
  const tError = useTranslations("error");
  const tToast = useTranslations("toast");
  const tPage = useTranslations("page.adminLanguage");
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");

  const {
    query,
    statusFilter,
    setPage,
    pageSize,
    sortKey,
    sortDir,
    listFiltered,
    dragEnabled,
    baseListParams: listFetchParams,
    safePage,
    totalPages,
    handleSortChange,
    onSearchChange,
    onStatusFilterChange,
    onPageSizeChange,
  } = useCrudListQuery();

  const [rows, setRows] = useState<SystemLanguageRow[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SystemLanguageSheetState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortableEpoch, setSortableEpoch] = useState(0);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSystemLanguages(locale, listFetchParams);
      setRows(result.rows);
      setListMeta(result.meta);
    } catch (err: unknown) {
      const message =
        err instanceof SystemLanguageApiError ? err.message : tToast("demoError");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [locale, listFetchParams, tToast]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadList();
    });
  }, [loadList]);

  const total = listMeta.total;

  const patchRowField = async (
    id: number,
    body: Parameters<typeof patchSystemLanguage>[1],
    rollback: () => void
  ) => {
    try {
      await patchSystemLanguage(id, body, locale);
      await loadList();
      toast.success(tCrud("toast.saved"));
    } catch (err) {
      rollback();
      toast.error(
        err instanceof SystemLanguageApiError ? err.message : tToast("demoError")
      );
    }
  };

  const handleToggleActive = (id: number, active: boolean) => {
    const prev = rows.find((r) => r.id === id);
    if (!prev) return;
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, is_active: active } : r))
    );
    void patchRowField(id, { is_active: active }, () =>
      setRows((current) =>
        current.map((r) =>
          r.id === id ? { ...r, is_active: prev.is_active } : r
        )
      )
    );
  };

  const handleToggleDefault = (id: number, isDefault: boolean) => {
    const snapshot = rows;
    const prev = snapshot.find((r) => r.id === id);
    if (!prev) return;
    setRows((current) =>
      current.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            is_default: isDefault,
            is_active: isDefault ? true : r.is_active,
          };
        }
        if (isDefault) return { ...r, is_default: false };
        return r;
      })
    );
    void patchRowField(id, { is_default: isDefault }, () => setRows(snapshot));
  };

  const handleSave = async (
    id: number | null,
    payload: SystemLanguageEditPayload
  ) => {
    try {
      if (id == null) {
        await createSystemLanguage(
          {
            locale: payload.locale,
            name: payload.name,
            is_active: payload.isActive,
            is_default: payload.isDefault,
          },
          locale
        );
        toast.success(tCrud("toast.created"));
      } else {
        await patchSystemLanguage(
          id,
          {
            locale: payload.locale,
            name: payload.name,
            is_active: payload.isActive,
            is_default: payload.isDefault,
          },
          locale
        );
        toast.success(tCrud("toast.saved"));
      }
      setSheet(null);
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof SystemLanguageApiError ? err.message : tToast("demoError")
      );
    }
  };

  const handleRowAction = (id: number, action: TableIconActionKey) => {
    if (action === "delete") {
      setDeleteId(id);
      return;
    }
    if (action === "edit") {
      const row = rows.find((r) => r.id === id);
      if (row) setSheet({ mode: "edit", row });
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteSystemLanguage(deleteId, locale);
      setDeleteId(null);
      toast.success(tCrud("toast.deleted"));
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof SystemLanguageApiError ? err.message : tToast("demoError")
      );
    }
  };

  const handleDragEnd: ComponentProps<
    typeof DragDropProvider
  >["onDragEnd"] = (event) => {
    if (event.canceled || !dragEnabled) return;
    const indices = sortableIndicesFromSource(event.operation?.source);
    if (!indices || indices.from === indices.to) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    const dragRow = rows[indices.from];
    const targetRow = rows[indices.to];
    if (!dragRow || !targetRow) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    void reorderSystemLanguages(dragRow.id, targetRow.id, locale)
      .then(() => loadList())
      .then(() => toast.success(tCrud("toast.reordered")))
      .catch((err: unknown) => {
        queueMicrotask(() => setSortableEpoch((e) => e + 1));
        toast.error(
          err instanceof SystemLanguageApiError ? err.message : undefined
        );
      });
  };

  return (
    <div className="space-y-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("desc")}
        actions={
          <Button
            type="button"
            size="lg"
            onClick={() => setSheet({ mode: "create" })}
          >
            <Plus className="text-current" />
            {tPage("add")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField value={query} onChange={onSearchChange} />
        <StatusFilterGroup
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
      </div>

      <div className="surface-table-wrap">
        <DragDropProvider onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" aria-hidden />
                <TableSortHead
                  columnKey="locale"
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "locale"
                  )}
                >
                  {tCol("locale")}
                </TableSortHead>
                <TableSortHead
                  columnKey="name"
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "name"
                  )}
                >
                  {tCol("name")}
                </TableSortHead>
                <TableSortHead
                  columnKey="is_active"
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  align="center"
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "status"
                  )}
                >
                  {tCol("status")}
                </TableSortHead>
                <TableSortHead
                  columnKey="is_default"
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  align="center"
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "default"
                  )}
                >
                  {tCol("default")}
                </TableSortHead>
                <TableSortHead
                  align="center"
                  columnKey="updated_at"
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "updatedAt"
                  )}
                >
                  {tCol("updatedAt")}
                </TableSortHead>
                <TableHead align="center" className="text-center">
                  {tCrud("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={dragEnabled ? sortableEpoch : "header-sort"}>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="text-center">
                    …
                  </TableCell>
                </TableRow>
              ) : rows.length ? (
                rows.map((row, index) =>
                  dragEnabled ? (
                    <SortableLanguageRow
                      key={row.id}
                      row={row}
                      index={index}
                      locale={locale}
                      dragEnabled={dragEnabled}
                      onToggleActive={handleToggleActive}
                      onToggleDefault={handleToggleDefault}
                      onAction={handleRowAction}
                    />
                  ) : (
                    <StaticLanguageRow
                      key={row.id}
                      row={row}
                      locale={locale}
                      onToggleActive={handleToggleActive}
                      onToggleDefault={handleToggleDefault}
                      onAction={handleRowAction}
                    />
                  )
                )
              ) : (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="text-center">
                    {tError("noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DragDropProvider>
      </div>

      <CrudPaginationBar
        page={safePage(total)}
        pageSize={pageSize}
        meta={{ total, totalPages: totalPages(total) }}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
      />

      <SystemLanguageEditSheet
        state={sheet}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
        onSave={handleSave}
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
