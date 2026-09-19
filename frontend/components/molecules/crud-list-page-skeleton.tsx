"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { CrudListTableSkeleton } from "./crud-list-table-skeleton";

export type CrudListPageSkeletonProps = {
  tableColumns?: number;
  tableRows?: number;
  showDragColumn?: boolean;
  toolbarFilterSlots?: number;
  className?: string;
};

export function CrudListPageSkeleton({
  tableColumns = 6,
  tableRows = 10,
  showDragColumn = false,
  toolbarFilterSlots = 0,
  className,
}: CrudListPageSkeletonProps) {
  const tCrud = useTranslations("crud");

  return (
    <div
      className={cn("flex flex-col", className)}
      aria-busy="true"
      aria-label={tCrud("loading")}
    >
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 shrink-0 rounded-md" />
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-full max-w-sm min-w-48 flex-1 rounded-md" />
        {Array.from({ length: toolbarFilterSlots }, (_, i) => (
          <Skeleton key={i} className="h-10 w-44 rounded-md" />
        ))}
        <Skeleton className="h-10 w-52 rounded-md" />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {showDragColumn ? (
                <TableHead className="w-10" aria-hidden />
              ) : null}
              {Array.from({ length: tableColumns }, (_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-3 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <CrudListTableSkeleton
              columnCount={tableColumns}
              rowCount={tableRows}
              showDragColumn={showDragColumn}
            />
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-40 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </div>
    </div>
  );
}
