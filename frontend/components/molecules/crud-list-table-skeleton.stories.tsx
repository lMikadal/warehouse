"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { CrudListTableSkeleton } from "./crud-list-table-skeleton";

const meta = {
  title: "Molecules/CrudListTableSkeleton",
  component: CrudListTableSkeleton,
  decorators: [
    (Story) => (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" aria-hidden />
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Story />
          </TableBody>
        </Table>
      </div>
    ),
  ],
} satisfies Meta<typeof CrudListTableSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    columnCount: 3,
    rowCount: 5,
    showDragColumn: true,
  },
};

export const WithoutGrip: Story = {
  args: {
    columnCount: 6,
    rowCount: 3,
    showDragColumn: false,
  },
};
