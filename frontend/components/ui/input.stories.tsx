import type { Meta, StoryObj } from "@storybook/nextjs";

import { Input } from "@/components/ui/input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Placeholder",
  },
};

export const Search: Story = {
  args: {
    type: "search",
    placeholder: "ค้นหา",
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    defaultValue: "Invalid value",
  },
};
