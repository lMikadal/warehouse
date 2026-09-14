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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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

function PermissionColumnFilterCombobox({
  label,
  value,
  onChange,
  options,
  inputClassName,
  emptyLabel,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  inputClassName: string;
  emptyLabel: string;
  placeholder: string;
}) {
  const comboboxValue = value === "" ? null : value;

  return (
    <Combobox
      items={options}
      value={comboboxValue}
      itemToStringLabel={(itemValue) =>
        options.find((o) => o.value === itemValue)?.label ?? ""
      }
      onValueChange={(next) => onChange(next ?? "")}
    >
      <ComboboxInput
        className={inputClassName}
        placeholder={placeholder}
        aria-label={label}
        showClear={value !== ""}
      />
      <ComboboxContent>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
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
        <PermissionColumnFilterCombobox
          label={tCol("module")}
          placeholder={tCrud("filter.select", { label: tCol("module") })}
          emptyLabel={tComboboxEmpty("noResults")}
          value={moduleFilter}
          options={moduleFilterOptions}
          inputClassName="w-[min(100%,12rem)]"
          onChange={(value) => {
            setModuleFilter(value);
            setTypeFilter("");
            setSortKey(null);
            setSortDir(null);
            resetFiltersPage();
          }}
        />
        <PermissionColumnFilterCombobox
          label={tCol("type")}
          placeholder={tCrud("filter.select", { label: tCol("type") })}
          emptyLabel={tComboboxEmpty("noResults")}
          value={typeFilter}
          options={typeFilterOptions}
          inputClassName="w-[min(100%,14rem)]"
          onChange={(value) => {
            setTypeFilter(value);
            setSortKey(null);
            setSortDir(null);
            resetFiltersPage();
          }}
        />
        <PermissionColumnFilterCombobox
          label={tCol("action")}
          placeholder={tCrud("filter.select", { label: tCol("action") })}
          emptyLabel={tComboboxEmpty("noResults")}
          value={actionFilter}
          options={actionFilterOptions}
          inputClassName="w-[min(100%,11rem)]"
          onChange={(value) => {
            setActionFilter(value);
            setSortKey(null);
            setSortDir(null);
            resetFiltersPage();
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
