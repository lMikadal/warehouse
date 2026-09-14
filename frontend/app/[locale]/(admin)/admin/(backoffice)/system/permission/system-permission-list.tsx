"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import {
  StatusFilterGroup,
  type StatusFilterValue,
} from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableSortHead,
  type TableSortDirection,
} from "@/components/ui/table";
import type { PageSizeOption } from "@/lib/crud-pagination";
import { PERM_ACTIONS, PERM_PAGES } from "@/lib/perm-catalog";
import {
  fetchSystemPermissions,
  patchSystemPermission,
  SystemPermissionApiError,
  type SystemPermissionListParams,
  type SystemPermissionRow,
} from "@/lib/system-permission-api";

const COLUMN_COUNT = 5;

const PERM_MODULES = [...new Set(PERM_PAGES.map((p) => p.permModule))].sort();

type ColSortKey = "code" | "module" | "type" | "action" | "status";

function sortApiKey(col: ColSortKey): string {
  return col === "status" ? "is_active" : col;
}

function sortFieldLabel(
  tCrud: ReturnType<typeof useTranslations<"crud">>,
  tCol: ReturnType<typeof useTranslations<"col">>,
  sortKey: string | null,
  sortDir: TableSortDirection | null,
  fieldKey: ColSortKey
): string {
  const field = tCol(fieldKey === "status" ? "status" : fieldKey);
  if (sortKey !== sortApiKey(fieldKey) || !sortDir) {
    return tCrud("sort.none", { field });
  }
  return sortDir === "desc"
    ? tCrud("sort.desc", { field })
    : tCrud("sort.asc", { field });
}

function typesForModule(module: string): string[] {
  const pages = module
    ? PERM_PAGES.filter((p) => p.permModule === module)
    : PERM_PAGES;
  return [...new Set(pages.map((p) => p.type))].sort();
}

export function SystemPermissionList() {
  const locale = useLocale();
  const tError = useTranslations("error");
  const tToast = useTranslations("toast");
  const tPage = useTranslations("page.adminPermission");
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tAction = useTranslations("action");
  const tForm = useTranslations("form.placeholder");

  const [rows, setRows] = useState<SystemPermissionRow[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<TableSortDirection | null>(null);

  const typeOptions = useMemo(
    () => typesForModule(moduleFilter),
    [moduleFilter]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const listFiltered =
    debouncedQuery.trim() !== "" ||
    statusFilter !== "" ||
    moduleFilter !== "" ||
    typeFilter !== "" ||
    actionFilter !== "";

  const listFetchParams = useMemo((): SystemPermissionListParams => {
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
      module: moduleFilter || undefined,
      type: typeFilter || undefined,
      action: actionFilter || undefined,
      isActive,
      sort: !listFiltered && headerSortActive ? sortKey : undefined,
      order: !listFiltered && headerSortActive ? sortDir ?? undefined : undefined,
    };
  }, [
    page,
    pageSize,
    debouncedQuery,
    statusFilter,
    moduleFilter,
    typeFilter,
    actionFilter,
    sortKey,
    sortDir,
    listFiltered,
  ]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSystemPermissions(locale, listFetchParams);
      setRows(result.rows);
      setListMeta(result.meta);
    } catch (err: unknown) {
      const message =
        err instanceof SystemPermissionApiError
          ? err.message
          : tToast("demoError");
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const handleSortChange = (
    nextKey: string | null,
    nextDir: TableSortDirection | null
  ) => {
    if (listFiltered) return;
    setSortKey(nextKey);
    setSortDir(nextDir);
    setPage(1);
  };

  const resetFiltersPage = () => setPage(1);

  const handleToggleActive = async (id: number, active: boolean) => {
    const prev = rows.find((r) => r.id === id);
    if (!prev) return;
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, is_active: active } : r))
    );
    try {
      await patchSystemPermission(id, { is_active: active }, locale);
      await loadList();
      toast.success(tCrud("toast.saved"));
    } catch (err) {
      setRows((current) =>
        current.map((r) =>
          r.id === id ? { ...r, is_active: prev.is_active } : r
        )
      );
      toast.error(
        err instanceof SystemPermissionApiError ? err.message : tToast("demoError")
      );
    }
  };

  const actionLabel = (action: string) => {
    if (PERM_ACTIONS.includes(action as (typeof PERM_ACTIONS)[number])) {
      return tAction(action as (typeof PERM_ACTIONS)[number]);
    }
    return action;
  };

  return (
    <div className="space-y-4">
      <CrudPageHeader title={tPage("title")} description={tPage("desc")} />

      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setSortKey(null);
            setSortDir(null);
            resetFiltersPage();
          }}
        />
        <StatusFilterGroup
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setSortKey(null);
            setSortDir(null);
            resetFiltersPage();
          }}
        />
        <Select
          value={moduleFilter || "__all__"}
          onValueChange={(value) => {
            setModuleFilter(value === "__all__" ? "" : value);
            setTypeFilter("");
            setSortKey(null);
            setSortDir(null);
            resetFiltersPage();
          }}
        >
          <SelectTrigger className="w-[min(100%,12rem)]">
            <SelectValue
              placeholder={tForm("select", { label: tCol("module") })}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{tCrud("filter.all")}</SelectItem>
            {PERM_MODULES.map((mod) => (
              <SelectItem key={mod} value={mod}>
                {mod}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter || "__all__"}
          onValueChange={(value) => {
            setTypeFilter(value === "__all__" ? "" : value);
            setSortKey(null);
            setSortDir(null);
            resetFiltersPage();
          }}
        >
          <SelectTrigger className="w-[min(100%,14rem)]">
            <SelectValue
              placeholder={tForm("select", { label: tCol("type") })}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{tCrud("filter.all")}</SelectItem>
            {typeOptions.map((typ) => (
              <SelectItem key={typ} value={typ}>
                {typ}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={actionFilter || "__all__"}
          onValueChange={(value) => {
            setActionFilter(value === "__all__" ? "" : value);
            setSortKey(null);
            setSortDir(null);
            resetFiltersPage();
          }}
        >
          <SelectTrigger className="w-[min(100%,11rem)]">
            <SelectValue
              placeholder={tForm("select", { label: tCol("action") })}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{tCrud("filter.all")}</SelectItem>
            {PERM_ACTIONS.map((act) => (
              <SelectItem key={act} value={act}>
                {tAction(act)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableSortHead
                columnKey="code"
                sortable={!listFiltered}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "code"
                )}
              >
                {tCol("code")}
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
                columnKey="type"
                sortable={!listFiltered}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "type"
                )}
              >
                {tCol("type")}
              </TableSortHead>
              <TableSortHead
                columnKey="action"
                sortable={!listFiltered}
                activeSortKey={sortKey}
                sortDirection={sortDir}
                onSortChange={handleSortChange}
                sortLabel={sortFieldLabel(
                  tCrud,
                  tCol,
                  sortKey,
                  sortDir,
                  "action"
                )}
              >
                {tCol("action")}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center">
                  …
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.module}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{actionLabel(row.action)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusSwitchField
                        checked={row.is_active}
                        onCheckedChange={(checked) =>
                          void handleToggleActive(row.id, checked)
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center">
                  {tError("noData")}
                </TableCell>
              </TableRow>
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
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
