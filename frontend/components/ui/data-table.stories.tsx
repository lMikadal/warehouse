import type { Meta, StoryObj } from "@storybook/nextjs";
import type { ColumnDef } from "@tanstack/react-table";
import type { JSX } from "react";

import { DataTable, type DataTableProps } from "./data-table";

type Warehouse = {
  id: number;
  name: string;
  zone: string;
  status: "Active" | "Inactive";
};

// Cast to a concrete component signature so StoryObj infers Warehouse-typed args.
const WarehouseDataTable = DataTable as (props: DataTableProps<Warehouse, unknown>) => JSX.Element;

const meta = {
  title: "UI/DataTable",
  component: WarehouseDataTable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof WarehouseDataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const COLUMNS: ColumnDef<Warehouse, unknown>[] = [
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
