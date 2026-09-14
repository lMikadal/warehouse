"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import {
  SystemMenuEditSheet,
  type SystemMenuEditPayload,
  type SystemMenuSheetState,
} from "./system-menu-edit-sheet";
// import { Button } from "@/components/ui/button";
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
  isInvalidMenuParent,
  type AdminMenuRow,
} from "@/lib/admin-menu-mock";
import {
  fetchSystemMenus,
  moveSystemMenu,
  patchSystemMenu,
  SystemMenuApiError,
  type SystemMenuListParams,
} from "@/lib/system-menu-api";
import {
  isTreePathDescendant,
  resolveTreeDropZone,
  treeDepth,
  type TreeDropZone,
} from "@/lib/crud-list-rows";
import type { PageSizeOption } from "@/lib/crud-pagination";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

const COLUMN_COUNT = 7;

type MenuRowView = AdminMenuRow & { label: string };

type MenuDragIntent = {
  dragId: number;
  targetId: number;
  zone: TreeDropZone;
};

type DndOperation = {
  source?: { id?: unknown };
  target?: { id?: unknown } | null;
  position?: { y?: number; x?: number; current?: { y?: number; x?: number } };
  activatorEvent?: Event | null;
};

function pointerClientCoords(
  operation: DndOperation | undefined
): { x: number; y: number } | null {
  const current = operation?.position?.current;
  if (
    current &&
    Number.isFinite(current.x) &&
    Number.isFinite(current.y)
  ) {
    return { x: Number(current.x), y: Number(current.y) };
  }
  if (operation?.activatorEvent instanceof PointerEvent) {
    return {
      x: operation.activatorEvent.clientX,
      y: operation.activatorEvent.clientY,
    };
  }
  return null;
}

/** When sortable target stays on the dragged row, hit-test the row under the pointer. */
function resolveTargetIdFromPointer(
  operation: DndOperation | undefined,
  dragId: number
): number | null {
  const coords = pointerClientCoords(operation);
  if (!coords) return null;
  const stack = document.elementsFromPoint(coords.x, coords.y);
  for (const el of stack) {
    const row = el.closest("[data-menu-row-id]");
    if (!(row instanceof HTMLElement)) continue;
    const id = Number(row.getAttribute("data-menu-row-id"));
    if (Number.isFinite(id) && id !== dragId) return id;
  }
  return null;
}

function menuRowDropTargetClass(
  rowId: number,
  dropIntent: MenuDragIntent | null
): string {
  if (!dropIntent || dropIntent.targetId !== rowId) return "";
  switch (dropIntent.zone) {
    case "before":
      return "shadow-[inset_0_2px_0_0_var(--color-primary)]";
    case "after":
      return "shadow-[inset_0_-2px_0_0_var(--color-primary)]";
    case "child":
      return cn(
        "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))]",
        "shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--color-primary)_45%,transparent)]"
      );
    default:
      return "";
  }
}

function resolveMenuDragIntent(
  operation: DndOperation | undefined,
  fullSorted: MenuRowView[]
): MenuDragIntent | null {
  const source = operation?.source;
  const target = operation?.target;
  if (source?.id == null) return null;
  const dragId = Number(source.id);
  if (!Number.isFinite(dragId)) return null;

  let targetId =
    target?.id != null ? Number(target.id) : Number.NaN;
  if (!Number.isFinite(targetId) || targetId === dragId) {
    const fromPointer = resolveTargetIdFromPointer(operation, dragId);
    if (fromPointer != null) targetId = fromPointer;
  }
  if (!Number.isFinite(targetId) || dragId === targetId) return null;

  const dragRow = fullSorted.find((r) => r.id === dragId);
  const targetRow = fullSorted.find((r) => r.id === targetId);
  if (!dragRow || !targetRow) return null;

  if (
    dragRow.tree_path &&
    targetRow.tree_path &&
    isTreePathDescendant(dragRow.tree_path, targetRow.tree_path)
  ) {
    return null;
  }

  const el = document.querySelector(`[data-menu-row-id="${targetId}"]`);
  if (!(el instanceof HTMLElement)) return null;
  const rect = el.getBoundingClientRect();
  const pointerY = pointerClientCoords(operation)?.y;
  if (pointerY == null || !Number.isFinite(pointerY)) return null;

  const zone = resolveTreeDropZone(rect.top, rect.height, pointerY);
  return { dragId, targetId, zone };
}

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

function toRowView(row: AdminMenuRow, locale: DisplayLocale): MenuRowView {
  return { ...row, label: adminMenuLabel(row, locale) };
}

type MenuTableRowProps = {
  row: MenuRowView;
  index: number;
  locale: DisplayLocale;
  dragEnabled: boolean;
  dropIntent: MenuDragIntent | null;
  onToggleActive: (id: number, active: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
};

function MenuDropHint({
  row,
  dropIntent,
}: {
  row: MenuRowView;
  dropIntent: MenuDragIntent | null;
}) {
  const tCrud = useTranslations("crud");
  if (dropIntent == null || dropIntent.targetId !== row.id) return null;
  const isChild = dropIntent.zone === "child";
  return (
    <span
      className="mb-1 block w-fit max-w-full truncate rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
      aria-live="polite"
    >
      {isChild
        ? tCrud("reorder.dropChild", { label: row.label })
        : tCrud("reorder.dropSibling", { label: row.label })}
    </span>
  );
}

function SortableMenuTableRow({
  row,
  index,
  locale,
  dropIntent,
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
      data-menu-row-id={row.id}
      className={cn(
        isDragging && "opacity-50",
        menuRowDropTargetClass(row.id, dropIntent)
      )}
    >
      <MenuTableCells
        row={row}
        locale={locale}
        dragEnabled
        dropIntent={dropIntent}
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
  dropIntent = null,
  handleRef,
  onToggleActive,
  onAction,
}: {
  row: MenuRowView;
  locale: DisplayLocale;
  dragEnabled: boolean;
  dropIntent?: MenuDragIntent | null;
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
        <MenuDropHint row={row} dropIntent={dropIntent} />
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
          actions={["edit" /* , "delete" */]}
          onAction={(action) => onAction(row.id, action)}
        />
      </TableCell>
    </>
  );
}

export function SystemMenuList() {
  const locale = useLocale() as DisplayLocale;
  const tError = useTranslations("error");
  const tToast = useTranslations("toast");
  const tPageMenu = useTranslations("page.adminMenu");
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");

  const [rows, setRows] = useState<AdminMenuRow[]>([]);
  const [pickerRows, setPickerRows] = useState<AdminMenuRow[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<TableSortDirection | null>(null);
  // const [deleteId, setDeleteId] = useState<number | null>(null);
  const [menuSheet, setMenuSheet] = useState<SystemMenuSheetState | null>(null);
  const [sortableEpoch, setSortableEpoch] = useState(0);
  const [dragIntent, setDragIntent] = useState<MenuDragIntent | null>(null);
  const dragIntentRef = useRef<MenuDragIntent | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const listFiltered =
    debouncedQuery.trim() !== "" || statusFilter !== "";

  const listFetchParams = useMemo((): SystemMenuListParams => {
    const isActive =
      statusFilter === "active"
        ? true
        : statusFilter === "inactive"
          ? false
          : undefined;
    const headerSortActive = sortKey != null && sortDir != null;
    return {
      page,
      limit: pageSize,
      search: debouncedQuery.trim() || undefined,
      isActive,
      sort: !listFiltered && headerSortActive ? sortKey : undefined,
      order: !listFiltered && headerSortActive ? sortDir ?? undefined : undefined,
    };
  }, [
    page,
    pageSize,
    debouncedQuery,
    statusFilter,
    sortKey,
    sortDir,
    listFiltered,
  ]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSystemMenus(locale, listFetchParams);
      setRows(result.rows);
      setListMeta(result.meta);
    } catch (err: unknown) {
      const message =
        err instanceof SystemMenuApiError ? err.message : tToast("demoError");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [locale, listFetchParams, tToast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    void fetchSystemMenus(locale, { page: 1, limit: 100 })
      .then((result) => {
        if (!cancelled) setPickerRows(result.rows);
      })
      .catch(() => {
        if (!cancelled) setPickerRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const pageRowViews = useMemo(
    () => rows.map((r) => toRowView(r, locale)),
    [rows, locale]
  );

  const total = listMeta.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const headerSortActive = sortKey != null && sortDir != null;
  const dragEnabled = !listFiltered && !headerSortActive;

  const handleSortChange = (
    nextKey: string | null,
    nextDir: TableSortDirection | null
  ) => {
    if (listFiltered) return;
    setSortKey(nextKey);
    setSortDir(nextDir);
    setPage(1);
  };

  const handleToggleActive = async (id: number, active: boolean) => {
    const prev = rows.find((r) => r.id === id);
    if (!prev) return;
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, is_active: active } : r))
    );
    try {
      await patchSystemMenu(id, { is_active: active }, locale);
      await loadList();
      toast.success(tCrud("toast.saved"));
    } catch (err) {
      setRows((current) =>
        current.map((r) =>
          r.id === id ? { ...r, is_active: prev.is_active } : r
        )
      );
      toast.error(
        err instanceof SystemMenuApiError ? err.message : tError("invalidParent")
      );
    }
  };

  const handleSaveMenu = async (
    id: number | null,
    payload: SystemMenuEditPayload
  ) => {
    if (id == null) {
      return;
    }
    try {
      await patchSystemMenu(
        id,
        {
          names: { th: payload.nameTh, en: payload.nameEn },
          is_active: payload.isActive,
          parent_id: payload.parentId,
        },
        locale
      );
      await loadList();
      toast.success(tCrud("toast.saved"));
      setMenuSheet(null);
    } catch (err) {
      const message =
        err instanceof SystemMenuApiError ? err.message : tError("invalidParent");
      toast.error(message);
    }
  };

  const handleRowAction = (id: number, action: TableIconActionKey) => {
    // if (action === "delete") {
    //   setDeleteId(id);
    //   return;
    // }
    if (action === "edit") {
      const row = rows.find((r) => r.id === id);
      if (row) setMenuSheet({ mode: "edit", row });
    }
  };

  // const handleConfirmDelete = () => {
  //   if (deleteId == null) return;
  //   setRows((prev) => removeMenuSubtree(prev, deleteId));
  //   setDeleteId(null);
  //   toast.success(tCrud("toast.deleted"));
  // };

  const syncDragIntent = (operation: DndOperation | undefined) => {
    if (!dragEnabled) {
      dragIntentRef.current = null;
      setDragIntent(null);
      return;
    }
    const next = resolveMenuDragIntent(operation, pageRowViews);
    dragIntentRef.current = next;
    setDragIntent(next);
  };

  const handleDragEnd: ComponentProps<
    typeof DragDropProvider
  >["onDragEnd"] = (event) => {
    const scheduleRejectDrag = (toastMessage?: string) => {
      queueMicrotask(() => {
        setSortableEpoch((e) => e + 1);
        if (toastMessage) toast.error(toastMessage);
      });
    };

    const intent =
      dragIntentRef.current ??
      resolveMenuDragIntent(
        event.operation as DndOperation | undefined,
        pageRowViews
      );
    dragIntentRef.current = null;
    setDragIntent(null);

    if (event.canceled || !dragEnabled) return;
    if (intent == null) {
      scheduleRejectDrag();
      return;
    }

    const dragRow = rows.find((r) => r.id === intent.dragId);
    const targetRow = rows.find((r) => r.id === intent.targetId);
    let errorKey: string | undefined;
    if (
      dragRow?.tree_path &&
      targetRow?.tree_path &&
      isTreePathDescendant(dragRow.tree_path, targetRow.tree_path)
    ) {
      errorKey = "reorder.intoSubtree";
    } else if (
      intent.zone === "child" &&
      isInvalidMenuParent(rows, intent.dragId, intent.targetId)
    ) {
      errorKey = "reorder.intoSubtree";
    } else if (
      intent.zone !== "child" &&
      targetRow != null &&
      targetRow.parent_id != null &&
      isInvalidMenuParent(rows, intent.dragId, targetRow.parent_id)
    ) {
      errorKey = "reorder.intoSubtree";
    }
    if (errorKey) {
      scheduleRejectDrag(tCrud(errorKey));
      return;
    }

    void moveSystemMenu(
      intent.dragId,
      intent.targetId,
      intent.zone,
      locale
    )
      .then(() => loadList())
      .then(() => toast.success(tCrud("toast.reordered")))
      .catch((err: unknown) => {
        scheduleRejectDrag(
          err instanceof SystemMenuApiError ? err.message : undefined
        );
      });
  };

  return (
    <div className="space-y-4">
      <CrudPageHeader
        title={tPageMenu("title")}
        description={tPageMenu("desc")}
        actions={
          undefined
          // <Button
          //   type="button"
          //   size="lg"
          //   onClick={() => setMenuSheet({ mode: "create" })}
          // >
          //   <Plus className="text-current" />
          //   {tPageMenu("add")}
          // </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setSortKey(null);
            setSortDir(null);
            setPage(1);
          }}
        />
        <StatusFilterGroup
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setSortKey(null);
            setSortDir(null);
            setPage(1);
          }}
        />
      </div>

      <div className="surface-table-wrap">
        <DragDropProvider
          onDragMove={({ operation }) => syncDragIntent(operation as DndOperation)}
          onDragOver={({ operation }) => syncDragIntent(operation as DndOperation)}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" aria-hidden />
                <TableSortHead
                  columnKey="label"
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
                  columnKey="module"
                  sortable={!listFiltered}
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
                  sortable={!listFiltered}
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
              ) : pageRowViews.length ? (
                pageRowViews.map((row, index) =>
                  dragEnabled ? (
                    <SortableMenuTableRow
                      key={row.id}
                      row={row}
                      index={index}
                      locale={locale}
                      dropIntent={dragIntent}
                      onToggleActive={handleToggleActive}
                      onAction={handleRowAction}
                    />
                  ) : (
                    <StaticMenuTableRow
                      key={row.id}
                      row={row}
                      locale={locale}
                      dropIntent={null}
                      dragEnabled={false}
                      onToggleActive={handleToggleActive}
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
        menuRows={pickerRows}
        onOpenChange={(open) => {
          if (!open) setMenuSheet(null);
        }}
        onSave={handleSaveMenu}
      />

      {/* <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleConfirmDelete}
      /> */}
    </div>
  );
}
