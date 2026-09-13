import type { Meta, StoryObj } from "@storybook/nextjs";

import { TableIconActions } from "./table-icon-actions";

const meta = {
  title: "Molecules/TableIconActions",
  component: TableIconActions,
} satisfies Meta<typeof TableIconActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WarehouseRow: Story = {
  args: {
    actions: ["view", "add", "delete"],
  },
};

export const ZoneCard: Story = {
  args: {
    actions: ["view", "edit", "delete"],
  },
};
