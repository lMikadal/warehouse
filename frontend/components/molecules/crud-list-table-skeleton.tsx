"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type CrudListTableSkeletonProps = {
  columnCount: number;
  rowCount?: number;
  showDragColumn?: boolean;
  className?: string;
};

export function CrudListTableSkeleton({
  columnCount,
  rowCount = 10,
  showDragColumn = false,
  className,
}: CrudListTableSkeletonProps) {
  const tCrud = useTranslations("crud");
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <TableRow
          key={rowIndex}
          className={className}
          aria-busy="true"
          aria-label={rowIndex === 0 ? tCrud("loading") : undefined}
        >
          {showDragColumn ? (
            <TableCell className="w-10">
              <Skeleton className="mx-auto size-4 rounded-sm" />
            </TableCell>
          ) : null}
          {Array.from({ length: columnCount }, (_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton
                className={cn(
                  "h-4",
                  colIndex === 0 ? "w-3/4 max-w-[12rem]" : "w-full max-w-[8rem]"
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
