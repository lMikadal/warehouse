"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";

type Row = { id: number; name: string; qty: number };

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "qty",
    header: () => <span className="w-full text-right">Qty</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {row.getValue("qty") as number}
      </span>
    ),
  },
];

const data: Row[] = [
  { id: 1, name: "ATW", qty: 1240 },
  { id: 2, name: "BKK", qty: 890 },
];

const meta = {
  title: "UI/DataTable",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DataTable columns={columns} data={data} />,
};
