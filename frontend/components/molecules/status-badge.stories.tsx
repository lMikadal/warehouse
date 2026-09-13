import type { Meta, StoryObj } from "@storybook/nextjs";

import { StatusBadge } from "./status-badge";

const meta = {
  title: "Molecules/StatusBadge",
  component: StatusBadge,
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: { active: true },
};

export const Inactive: Story = {
  args: { active: false },
};
