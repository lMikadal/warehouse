"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

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
import { cn } from "@/lib/utils";

const meta = {
  title: "UI/Table",
  component: Table,
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlignmentSample: Story = {
  render: () => (
    <div className="surface-table-wrap overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right tabular-nums">Qty</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>ATW</TableCell>
            <TableCell className="text-right tabular-nums">1,240</TableCell>
            <TableCell className="text-center">Active</TableCell>
            <TableCell className="text-center">
              <div className="inline-flex justify-center gap-1.5">···</div>
            </TableCell>
          </TableRow>
          <TableRow className={cn("bg-row-expanded")}>
            <TableCell colSpan={4} className="text-sm text-muted-foreground">
              Expanded row uses bg-row-expanded
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

type Row = { id: number; name: string; qty: number };

const sampleRows: Row[] = [
  { id: 1, name: "ATW", qty: 1240 },
  { id: 2, name: "BKK", qty: 890 },
  { id: 3, name: "CNX", qty: 2100 },
];

function sortLabel(
  t: ReturnType<typeof useTranslations<"crud">>,
  field: string,
  sortKey: string | null,
  sortDir: TableSortDirection | null,
  columnKey: string
) {
  if (sortKey !== columnKey || !sortDir) {
    return t("sortNone", { field });
  }
  if (sortDir === "desc") return t("sortDesc", { field });
  return t("sortAsc", { field });
}

export const SortableHeaders: Story = {
  render: function Render() {
    const t = useTranslations("crud");
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<TableSortDirection | null>(null);

    const rows = useMemo(() => {
      const copy = [...sampleRows];
      if (!sortKey || !sortDir) return copy;
      copy.sort((a, b) => {
        const av = sortKey === "name" ? a.name : a.qty;
        const bv = sortKey === "name" ? b.name : b.qty;
        const cmp =
          typeof av === "number"
            ? av - (bv as number)
            : String(av).localeCompare(String(bv));
        return sortDir === "desc" ? -cmp : cmp;
      });
      return copy;
    }, [sortKey, sortDir]);

    return (
      <div className="surface-table-wrap overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableSortHead
                columnKey="name"
                activeSortKey={sortKey}
                sortDirection={sortDir}
                sortLabel={sortLabel(t, "Name", sortKey, sortDir, "name")}
                onSortChange={(key, dir) => {
                  setSortKey(key);
                  setSortDir(dir);
                }}
              >
                Name
              </TableSortHead>
              <TableSortHead
                columnKey="qty"
                align="right"
                activeSortKey={sortKey}
                sortDirection={sortDir}
                sortLabel={sortLabel(t, "Qty", sortKey, sortDir, "qty")}
                onSortChange={(key, dir) => {
                  setSortKey(key);
                  setSortDir(dir);
                }}
              >
                Qty
              </TableSortHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.qty.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">···</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  },
};
