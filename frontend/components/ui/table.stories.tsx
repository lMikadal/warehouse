"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableSortHead,
  type TableSortDirection,
} from "./table";

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = [
  { id: 1, name: "Warehouse A", zone: "Zone 1", status: "Active" },
  { id: 2, name: "Warehouse B", zone: "Zone 2", status: "Inactive" },
  { id: 3, name: "Warehouse C", zone: "Zone 3", status: "Active" },
  { id: 4, name: "Warehouse D", zone: "Zone 1", status: "Active" },
  { id: 5, name: "Warehouse E", zone: "Zone 4", status: "Inactive" },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Zone</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.id}</TableCell>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.zone}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption>List of warehouses (5 total)</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.slice(0, 3).map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WithFooter: Story = {
  name: "With footer",
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Qty</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow><TableCell>Item A</TableCell><TableCell className="text-right">12</TableCell></TableRow>
        <TableRow><TableCell>Item B</TableCell><TableCell className="text-right">8</TableCell></TableRow>
        <TableRow><TableCell>Item C</TableCell><TableCell className="text-right">5</TableCell></TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right">25</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

export const WithSortHeaders: Story = {
  name: "With sort headers",
  render: function Render() {
    const [sort, setSort] = useState<{ col: string | null; dir: TableSortDirection | null }>({
      col: null,
      dir: null,
    });

    function handleSort(sortKey: string | null, direction: TableSortDirection | null) {
      setSort({ col: sortKey, dir: direction });
    }

    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">
          Active: {sort.col || "—"} {sort.dir || ""}
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableSortHead
                columnKey="name"
                activeSortKey={sort.col}
                sortDirection={sort.col === "name" ? sort.dir : null}
                sortLabel="Sort by Name"
                onSortChange={handleSort}
              >
                Name
              </TableSortHead>
              <TableSortHead
                columnKey="zone"
                activeSortKey={sort.col}
                sortDirection={sort.col === "zone" ? sort.dir : null}
                sortLabel="Sort by Zone"
                onSortChange={handleSort}
              >
                Zone
              </TableSortHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.zone}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  },
};

export const EmptyState: Story = {
  name: "Empty state",
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Zone</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            No warehouses found.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
