import type { Meta, StoryObj } from "@storybook/nextjs";

import { CrudListPageSkeleton } from "./crud-list-page-skeleton";

const meta = {
  title: "Molecules/CrudListPageSkeleton",
  component: CrudListPageSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CrudListPageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tableColumns: 6,
    showDragColumn: true,
    toolbarFilterSlots: 0,
  },
};

export const WithToolbarFilters: Story = {
  args: {
    tableColumns: 5,
    showDragColumn: false,
    toolbarFilterSlots: 2,
  },
};
