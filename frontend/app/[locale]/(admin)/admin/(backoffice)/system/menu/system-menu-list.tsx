"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ComponentProps, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import {
  SystemMenuEditSheet,
  type SystemMenuEditPayload,
  type SystemMenuSheetState,
} from "./system-menu-edit-sheet";
import { Button } from "@/components/ui/button";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import {
  StatusFilterGroup,
  type StatusFilterValue,
} from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { ButtonIcon } from "@/components/ui/button-icon";
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
import {
  adminMenuLabel,
  createInitialAdminMenuRows,
  type AdminMenuRow,
} from "@/lib/admin-menu-mock";
import {
  applyHeaderSort,
  defaultSortRows,
  findDragMoveIndices,
  reorderFlatSortOrder,
  reorderIdsFromSortableEvent,
  treeDepth,
} from "@/lib/crud-list-rows";
import type { PageSizeOption } from "@/lib/crud-pagination";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

const COLUMN_COUNT = 7;

type MenuRowView = AdminMenuRow & { label: string };

type ColSortKey = "name" | "module" | "path" | "status" | "updatedAt";

function sortFieldLabel(
  tCrud: ReturnType<typeof useTranslations<"crud">>,
  tCol: ReturnType<typeof useTranslations<"col">>,
  sortKey: string | null,
  sortDir: TableSortDirection | null,
  fieldKey: ColSortKey
): string {
  const field = tCol(fieldKey);
  if (sortKey !== fieldKey || !sortDir) {
    return tCrud("sort.none", { field });
  }
  return sortDir === "desc"
    ? tCrud("sort.desc", { field })
    : tCrud("sort.asc", { field });
}

function filterMenuRows(
  rows: AdminMenuRow[],
  query: string,
  status: StatusFilterValue,
  locale: DisplayLocale
): AdminMenuRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (status === "active" && !row.is_active) return false;
    if (status === "inactive" && row.is_active) return false;
    if (!q) return true;
    const label = adminMenuLabel(row, locale).toLowerCase();
    const pathDisplay = (row.path || "—").toLowerCase();
    return (
      label.includes(q) ||
      row.module.toLowerCase().includes(q) ||
      pathDisplay.includes(q)
    );
  });
}

function toRowView(row: AdminMenuRow, locale: DisplayLocale): MenuRowView {
  return { ...row, label: adminMenuLabel(row, locale) };
}

function nextMenuId(rows: AdminMenuRow[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

function buildRootMenuRow(
  rows: AdminMenuRow[],
  payload: SystemMenuEditPayload
): AdminMenuRow {
  const id = nextMenuId(rows);
  const now = new Date().toISOString();
  const rootSiblings = rows.filter((r) => r.parent_id == null);
  const maxSort = rootSiblings.reduce(
    (max, r) => Math.max(max, r.sort_order),
    0
  );
  return {
    id,
    parent_id: null,
    module: payload.module.trim(),
    path: payload.path || null,
    sort_order: maxSort + 100,
    is_active: payload.isActive,
    tree_path: `n${id}`,
    labels: { th: payload.nameTh, en: payload.nameEn },
    created_at: now,
    updated_at: now,
  };
}

function removeMenuSubtree(rows: AdminMenuRow[], id: number): AdminMenuRow[] {
  const target = rows.find((row) => row.id === id);
  if (!target) return rows;
  const prefix = `${target.tree_path}.`;
  return rows.filter(
    (row) => row.id !== id && !row.tree_path.startsWith(prefix)
  );
}

type MenuTableRowProps = {
  row: MenuRowView;
  index: number;
  locale: DisplayLocale;
  dragEnabled: boolean;
  onToggleActive: (id: number, active: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
};

function SortableMenuTableRow({
  row,
  index,
  locale,
  onToggleActive,
  onAction,
}: Omit<MenuTableRowProps, "dragEnabled">) {
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
  });

  return (
    <TableRow
      ref={ref}
      data-slot="table-row"
      className={cn(isDragging && "opacity-50")}
    >
      <MenuTableCells
        row={row}
        locale={locale}
        dragEnabled
        handleRef={handleRef}
        onToggleActive={onToggleActive}
        onAction={onAction}
      />
    </TableRow>
  );
}

function StaticMenuTableRow({
  row,
  locale,
  dragEnabled,
  onToggleActive,
  onAction,
}: Omit<MenuTableRowProps, "index">) {
  return (
    <TableRow>
      <MenuTableCells
        row={row}
        locale={locale}
        dragEnabled={dragEnabled}
        onToggleActive={onToggleActive}
        onAction={onAction}
      />
    </TableRow>
  );
}

function MenuTableCells({
  row,
  locale,
  dragEnabled,
  handleRef,
  onToggleActive,
  onAction,
}: {
  row: MenuRowView;
  locale: DisplayLocale;
  dragEnabled: boolean;
  handleRef?: (element: Element | null) => void;
  onToggleActive: (id: number, active: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
}) {
  const tCrud = useTranslations("crud");
  const depth = treeDepth(row.tree_path);

  return (
    <>
      <TableCell className="w-10 text-center">
        <ButtonIcon
          type="button"
          size="md"
          ref={dragEnabled ? handleRef : undefined}
          disabled={!dragEnabled}
          aria-label={tCrud("reorder.drag")}
          className={cn(
            "shrink-0 text-muted-foreground",
            dragEnabled
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-not-allowed"
          )}
        >
          <GripVertical className="text-current" />
        </ButtonIcon>
      </TableCell>
      <TableCell>
        <span
          className="block"
          style={depth > 0 ? { paddingLeft: `${depth * 1.25}rem` } : undefined}
        >
          {row.label}
        </span>
      </TableCell>
      <TableCell>{row.module}</TableCell>
      <TableCell>{row.path || "—"}</TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <StatusSwitchField
            checked={row.is_active}
            onCheckedChange={(checked) => onToggleActive(row.id, checked)}
          />
        </div>
      </TableCell>
      <TableCell className="text-center">{formatDateTime(row.updated_at, locale)}</TableCell>
      <TableCell className="text-center">
        <TableIconActions
          actions={["edit", "delete"]}
          onAction={(action) => onAction(row.id, action)}
        />
      </TableCell>
    </>
  );
}

export function SystemMenuList() {
  const locale = useLocale() as DisplayLocale;
  const tError = useTranslations("error");
  const tPageMenu = useTranslations("page.adminMenu");
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");

  const [rows, setRows] = useState<AdminMenuRow[]>(() =>
    createInitialAdminMenuRows()
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<TableSortDirection | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [menuSheet, setMenuSheet] = useState<SystemMenuSheetState | null>(null);

  const fullSorted = useMemo(() => {
    const filtered = filterMenuRows(rows, query, statusFilter, locale);
    const withLabel = filtered.map((r) => toRowView(r, locale));
    if (sortKey && sortDir) {
      return applyHeaderSort(withLabel, sortKey, sortDir, (row) => ({
        label: row.label,
        module: row.module,
        path: row.path ?? "",
        is_active: row.is_active,
        updated_at: row.updated_at,
      }));
    }
    return defaultSortRows(withLabel).map((r) => toRowView(r, locale));
  }, [rows, query, statusFilter, locale, sortKey, sortDir]);

  const total = fullSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = fullSorted.slice(pageStart, pageStart + pageSize);
  const dragEnabled = sortKey == null;

  const handleSortChange = (
    nextKey: string | null,
    nextDir: TableSortDirection | null
  ) => {
    setSortKey(nextKey);
    setSortDir(nextDir);
    setPage(1);
  };

  const handleToggleActive = (id: number, active: boolean) => {
    const now = new Date().toISOString();
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, is_active: active, updated_at: now } : r
      )
    );
    toast.success(tCrud("toast.saved"));
  };

  const handleSaveMenu = (
    id: number | null,
    payload: SystemMenuEditPayload
  ) => {
    if (id == null) {
      setRows((prev) => [...prev, buildRootMenuRow(prev, payload)]);
      setMenuSheet(null);
      toast.success(tCrud("toast.created"));
      return;
    }
    const now = new Date().toISOString();
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              labels: { th: payload.nameTh, en: payload.nameEn },
              path: payload.path || null,
              is_active: payload.isActive,
              updated_at: now,
            }
          : r
      )
    );
    setMenuSheet(null);
    toast.success(tCrud("toast.saved"));
  };

  const handleRowAction = (id: number, action: TableIconActionKey) => {
    if (action === "delete") {
      setDeleteId(id);
      return;
    }
    if (action === "edit") {
      const row = rows.find((r) => r.id === id);
      if (row) setMenuSheet({ mode: "edit", row });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteId == null) return;
    setRows((prev) => removeMenuSubtree(prev, deleteId));
    setDeleteId(null);
    toast.success(tCrud("toast.deleted"));
  };

  const handleDragEnd: ComponentProps<
    typeof DragDropProvider
  >["onDragEnd"] = (event) => {
    if (event.canceled || !dragEnabled) return;
    const before = pageRows.map((r) => r.id);
    const after = reorderIdsFromSortableEvent(before, event);
    if (!after) return;
    const indices = findDragMoveIndices(before, after);
    if (!indices) return;
    const absFrom = pageStart + indices.from;
    const absTo = pageStart + indices.to;
    const srcRow = fullSorted[absFrom];
    const dstRow = fullSorted[absTo];
    if (
      srcRow == null ||
      dstRow == null ||
      srcRow.parent_id !== dstRow.parent_id
    ) {
      toast.warning(tCrud("reorder.siblingOnly"));
      return;
    }
    const next = reorderFlatSortOrder(
      rows,
      fullSorted,
      absFrom,
      absTo,
      (a, b) => a.parent_id === b.parent_id
    );
    if (next == null) return;
    setRows(next);
    toast.success(tCrud("toast.reordered"));
  };

  return (
    <div className="space-y-4">
      <CrudPageHeader
        title={tPageMenu("title")}
        description={tPageMenu("desc")}
        actions={
          <Button
            type="button"
            size="lg"
            onClick={() => setMenuSheet({ mode: "create" })}
          >
            <Plus className="text-current" />
            {tPageMenu("add")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <StatusFilterGroup
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
      </div>

      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" aria-hidden />
              <TableSortHead
                columnKey="label"
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
                columnKey="module"
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "module"
                )}
              >
                {tCol("module")}
              </TableSortHead>
              <TableSortHead
                columnKey="path"
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "path"
                )}
              >
                {tCol("path")}
              </TableSortHead>
              <TableSortHead
                columnKey="is_active"
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
                align="center"
                columnKey="updated_at"
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
              <TableHead align="center" className="text-center">{tCrud("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          {dragEnabled ? (
            <DragDropProvider onDragEnd={handleDragEnd}>
              <TableBody>
                {pageRows.length  ? (
                  pageRows.map((row, index) => (
                    <SortableMenuTableRow
                      key={row.id}
                      row={row}
                      index={index}
                      locale={locale}
                      onToggleActive={handleToggleActive}
                      onAction={handleRowAction}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={COLUMN_COUNT} className="text-center">
                      {tError("noData")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </DragDropProvider>
          ) : (
            <TableBody>
              {pageRows.length ? (
                pageRows.map((row) => (
                  <StaticMenuTableRow
                    key={row.id}
                    row={row}
                    locale={locale}
                    dragEnabled={false}
                    onToggleActive={handleToggleActive}
                    onAction={handleRowAction}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="h-24 text-center">
                    —
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>
      </div>

      <CrudPaginationBar
        page={safePage}
        pageSize={pageSize}
        meta={{ total, totalPages }}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <SystemMenuEditSheet
        state={menuSheet}
        onOpenChange={(open) => {
          if (!open) setMenuSheet(null);
        }}
        onSave={handleSaveMenu}
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
