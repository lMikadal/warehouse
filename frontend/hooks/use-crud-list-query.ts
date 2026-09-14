"use client";

import { useEffect, useMemo, useState } from "react";

import type { StatusFilterValue } from "@/components/molecules/status-filter-group";
import type { TableSortDirection } from "@/components/ui/table";
import type { PageSizeOption } from "@/lib/crud-pagination";

export type UseCrudListQueryOptions = {
  debounceMs?: number;
  /** Geo column filters, permission module/type/action, etc. */
  extraFiltered?: boolean;
};

export function useCrudListQuery(options?: UseCrudListQueryOptions) {
  const debounceMs = options?.debounceMs ?? 300;
  const extraFiltered = options?.extraFiltered ?? false;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<TableSortDirection | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => window.clearTimeout(timer);
  }, [query, debounceMs]);

  const listFiltered =
    debouncedQuery.trim() !== "" || statusFilter !== "" || extraFiltered;

  const headerSortActive = sortKey != null && sortDir != null;
  const dragEnabled = !listFiltered && !headerSortActive;

  const isActiveFromStatus = useMemo((): boolean | undefined => {
    if (statusFilter === "active") return true;
    if (statusFilter === "inactive") return false;
    return undefined;
  }, [statusFilter]);

  const sortParamsForFetch = useMemo(() => {
    if (listFiltered || !headerSortActive) {
      return {
        sort: undefined as string | undefined,
        order: undefined as "asc" | "desc" | undefined,
      };
    }
    return {
      sort: sortKey ?? undefined,
      order: sortDir ?? undefined,
    };
  }, [listFiltered, headerSortActive, sortKey, sortDir]);

  const baseListParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedQuery.trim() || undefined,
      isActive: isActiveFromStatus,
      ...sortParamsForFetch,
    }),
    [page, pageSize, debouncedQuery, isActiveFromStatus, sortParamsForFetch]
  );

  function totalPages(total: number): number {
    return Math.max(1, Math.ceil(total / pageSize));
  }

  function safePage(total: number): number {
    return Math.min(page, totalPages(total));
  }

  const clearSortAndPage = () => {
    setSortKey(null);
    setSortDir(null);
    setPage(1);
  };

  const handleSortChange = (
    nextKey: string | null,
    nextDir: TableSortDirection | null
  ) => {
    if (listFiltered) return;
    setSortKey(nextKey);
    setSortDir(nextDir);
    setPage(1);
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    clearSortAndPage();
  };

  const onStatusFilterChange = (value: StatusFilterValue) => {
    setStatusFilter(value);
    clearSortAndPage();
  };

  const onPageSizeChange = (size: PageSizeOption) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    query,
    setQuery,
    debouncedQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortKey,
    sortDir,
    setSortKey,
    setSortDir,
    listFiltered,
    headerSortActive,
    dragEnabled,
    isActiveFromStatus,
    sortParamsForFetch,
    baseListParams,
    totalPages,
    safePage,
    clearSortAndPage,
    handleSortChange,
    onSearchChange,
    onStatusFilterChange,
    onPageSizeChange,
  };
}
