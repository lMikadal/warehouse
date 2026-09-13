import type { Meta, StoryObj } from "@storybook/nextjs";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "./data-table";

const meta = {
  title: "UI/DataTable",
  component: DataTable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

type Warehouse = {
  id: number;
  name: string;
  zone: string;
  status: "Active" | "Inactive";
};

const COLUMNS: ColumnDef<Warehouse, string>[] = [
  { accessorKey: "id", header: "#" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "zone", header: "Zone" },
  { accessorKey: "status", header: "Status" },
];

const DATA: Warehouse[] = [
  { id: 1, name: "Warehouse A", zone: "Zone 1", status: "Active" },
  { id: 2, name: "Warehouse B", zone: "Zone 2", status: "Inactive" },
  { id: 3, name: "Warehouse C", zone: "Zone 3", status: "Active" },
  { id: 4, name: "Warehouse D", zone: "Zone 1", status: "Active" },
  { id: 5, name: "Warehouse E", zone: "Zone 4", status: "Inactive" },
];

export const Default: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
  },
};

export const EmptyState: Story = {
  name: "Empty state",
  args: {
    columns: COLUMNS,
    data: [],
  },
};
