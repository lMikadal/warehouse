"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "cn"

import {
  cycleTableSort,
  tableSortAriaSort,
  type TableSortDirection,
} from "@/lib/table-sort"

/** Header and body row height (CRUD list tables). */
const TABLE_ROW_HEIGHT_CLASS = "h-[57px]"

/** Design `.data-table th` — tinted head row, muted labels */
const TABLE_HEAD_CELL_CLASS = cn(
  TABLE_ROW_HEIGHT_CLASS,
  "bg-warehouse-table-head font-semibold tracking-[0.01em] text-muted-foreground"
)

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b [&_tr]:hover:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        TABLE_HEAD_CELL_CLASS,
        "px-2 text-left align-middle text-sm whitespace-nowrap has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props}
    />
  )
}

type TableSortAlign = "left" | "center" | "right"

function TableSortHead({
  className,
  columnKey,
  activeSortKey = null,
  sortDirection = null,
  onSortChange,
  align = "left",
  sortLabel,
  sortable = true,
  children,
  ...props
}: React.ComponentProps<"th"> & {
  columnKey: string
  activeSortKey?: string | null
  sortDirection?: TableSortDirection | null
  onSortChange?: (
    sortKey: string | null,
    direction: TableSortDirection | null
  ) => void
  align?: TableSortAlign
  /** i18n aria-label (crud.sortNone / sortAsc / sortDesc) from parent */
  sortLabel: string
  sortable?: boolean
}) {
  if (!sortable) {
    return (
      <TableHead className={className} {...props}>
        {children}
      </TableHead>
    )
  }

  const ariaSort = tableSortAriaSort(
    activeSortKey,
    sortDirection,
    columnKey
  )
  const isActive = activeSortKey === columnKey && sortDirection != null
  const SortIcon =
    !isActive || !sortDirection
      ? ArrowUpDown
      : sortDirection === "desc"
        ? ArrowDown
        : ArrowUp

  const alignBtn =
    align === "right"
      ? "justify-end text-right tabular-nums"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-left"

  return (
    <th
      data-slot="table-sort-head"
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        TABLE_HEAD_CELL_CLASS,
        "p-0 align-middle text-sm whitespace-nowrap",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        className
      )}
      {...props}
    >
      <button
        type="button"
        className={cn(
          "inline-flex h-full w-full items-center gap-1.5 px-2 text-sm font-semibold text-inherit transition-colors",
          "hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          alignBtn
        )}
        aria-label={sortLabel}
        onClick={() => {
          const next = cycleTableSort(
            activeSortKey,
            activeSortKey === columnKey ? sortDirection : null,
            columnKey
          )
          onSortChange?.(next.sortKey, next.sortDir)
        }}
      >
        <span>{children}</span>
        <SortIcon
          className={cn(
            "size-3.5 shrink-0 opacity-45",
            isActive && "text-primary opacity-100"
          )}
          aria-hidden
        />
      </button>
    </th>
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        TABLE_ROW_HEIGHT_CLASS,
        "p-2 align-middle text-sm whitespace-nowrap has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableSortHead,
  TableRow,
  TableCell,
  TableCaption,
}
export type { TableSortDirection } from "@/lib/table-sort"
