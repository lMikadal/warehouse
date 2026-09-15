"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableSortHead,
  type TableSortDirection,
} from "@/components/ui/table";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  fetchSystemPermissionFilters,
  fetchSystemPermissions,
  patchSystemPermission,
  permissionActionLabel,
  SystemPermissionApiError,
  type SystemPermissionFilterFacets,
  type SystemPermissionListParams,
  type SystemPermissionRow,
} from "@/lib/system-permission-api";

const COLUMN_COUNT = 5;

const EMPTY_FACETS: SystemPermissionFilterFacets = {
  modules: [],
  types: [],
  actions: [],
};

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

type FilterOption = { value: string; label: string };

function filterFacetOptions(
  options: FilterOption[],
  search: string
): FilterOption[] {
  const q = search.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
  );
}

export function SystemPermissionList() {
  const locale = useLocale();
  const tError = useTranslations("error");
  const tToast = useTranslations("toast");
  const tPage = useTranslations("page.adminPermission");
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tAction = useTranslations("action");
  const tComboboxEmpty = useTranslations("form.combobox");
  const perm = useResourcePermissions("system", "system_permission");

  const [moduleFilter, setModuleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const columnFiltersActive =
    moduleFilter !== "" || typeFilter !== "" || actionFilter !== "";

  const {
    query,
    statusFilter,
    setPage,
    pageSize,
    sortKey,
    sortDir,
    listFiltered,
    baseListParams,
    safePage,
    totalPages,
    handleSortChange,
    onSearchChange,
    onStatusFilterChange,
    onPageSizeChange,
    clearSortAndPage,
  } = useCrudListQuery({ extraFiltered: columnFiltersActive });

  const listFetchParams = useMemo((): SystemPermissionListParams => {
    return {
      ...baseListParams,
      module: moduleFilter || undefined,
      type: typeFilter || undefined,
      action: actionFilter || undefined,
    };
  }, [baseListParams, moduleFilter, typeFilter, actionFilter]);

  const [rows, setRows] = useState<SystemPermissionRow[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [filterFacets, setFilterFacets] =
    useState<SystemPermissionFilterFacets>(EMPTY_FACETS);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const facets = await fetchSystemPermissionFilters(
          locale,
          moduleFilter || undefined
        );
        if (!cancelled) setFilterFacets(facets);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof SystemPermissionApiError
            ? err.message
            : tToast("demoError");
        toast.error(message);
        setFilterFacets(EMPTY_FACETS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, moduleFilter, tToast]);

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

  const moduleFilterOptions = useMemo(
    (): FilterOption[] =>
      filterFacets.modules.map((mod) => ({ value: mod, label: mod })),
    [filterFacets.modules]
  );
  const typeFilterOptions = useMemo(
    (): FilterOption[] =>
      filterFacets.types.map((typ) => ({ value: typ, label: typ })),
    [filterFacets.types]
  );
  const actionFilterOptions = useMemo(
    (): FilterOption[] =>
      filterFacets.actions.map((act) => ({
        value: act,
        label: permissionActionLabel(act, tAction),
      })),
    [filterFacets.actions, tAction]
  );

  const loadModuleFilterOptions = useCallback(
    (ctx: RemoteComboboxLoadContext) =>
      Promise.resolve(filterFacetOptions(moduleFilterOptions, ctx.search)),
    [moduleFilterOptions]
  );
  const loadTypeFilterOptions = useCallback(
    (ctx: RemoteComboboxLoadContext) =>
      Promise.resolve(filterFacetOptions(typeFilterOptions, ctx.search)),
    [typeFilterOptions]
  );
  const loadActionFilterOptions = useCallback(
    (ctx: RemoteComboboxLoadContext) =>
      Promise.resolve(filterFacetOptions(actionFilterOptions, ctx.search)),
    [actionFilterOptions]
  );

  const resolveModuleFilterLabel = useCallback(
    (value: string) =>
      Promise.resolve(
        moduleFilterOptions.find((o) => o.value === value)?.label ?? null
      ),
    [moduleFilterOptions]
  );
  const resolveTypeFilterLabel = useCallback(
    (value: string) =>
      Promise.resolve(
        typeFilterOptions.find((o) => o.value === value)?.label ?? null
      ),
    [typeFilterOptions]
  );
  const resolveActionFilterLabel = useCallback(
    (value: string) =>
      Promise.resolve(
        actionFilterOptions.find((o) => o.value === value)?.label ?? null
      ),
    [actionFilterOptions]
  );

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

  return (
    <div className="space-y-4">
      <CrudPageHeader title={tPage("title")} description={tPage("desc")} />

      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField value={query} onChange={onSearchChange} />
        <StatusFilterGroup
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
        <RemoteComboboxField
          label={tCol("module")}
          placeholder={tCrud("filter.select", { label: tCol("module") })}
          emptyLabel={tComboboxEmpty("noResults")}
          value={moduleFilter}
          inputClassName="w-[min(100%,12rem)]"
          onLoadOptions={loadModuleFilterOptions}
          resolveSelectedLabel={resolveModuleFilterLabel}
          onValueChange={(value) => {
            setModuleFilter(value);
            setTypeFilter("");
            clearSortAndPage();
          }}
        />
        <RemoteComboboxField
          label={tCol("type")}
          placeholder={tCrud("filter.select", { label: tCol("type") })}
          emptyLabel={tComboboxEmpty("noResults")}
          value={typeFilter}
          inputClassName="w-[min(100%,14rem)]"
          onLoadOptions={loadTypeFilterOptions}
          resolveSelectedLabel={resolveTypeFilterLabel}
          onValueChange={(value) => {
            setTypeFilter(value);
            clearSortAndPage();
          }}
        />
        <RemoteComboboxField
          label={tCol("action")}
          placeholder={tCrud("filter.select", { label: tCol("action") })}
          emptyLabel={tComboboxEmpty("noResults")}
          value={actionFilter}
          inputClassName="w-[min(100%,11rem)]"
          onLoadOptions={loadActionFilterOptions}
          resolveSelectedLabel={resolveActionFilterLabel}
          onValueChange={(value) => {
            setActionFilter(value);
            clearSortAndPage();
          }}
        />
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
                  <TableCell>
                    {permissionActionLabel(row.action, tAction)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusSwitchField
                        checked={row.is_active}
                        disabled={!perm.update}
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
        page={safePage(total)}
        pageSize={pageSize}
        meta={{ total, totalPages: totalPages(total) }}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
