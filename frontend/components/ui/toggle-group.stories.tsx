"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const meta = {
  title: "UI/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ToggleGroup defaultValue={["all"]}>
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="active">Active</ToggleGroupItem>
      <ToggleGroupItem value="inactive">Inactive</ToggleGroupItem>
    </ToggleGroup>
  ),
};
