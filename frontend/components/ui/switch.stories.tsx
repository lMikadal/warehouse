import type { Meta, StoryObj } from "@storybook/nextjs";

import { Switch } from "@/components/ui/switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  args: {
    defaultChecked: false,
  },
};

export const On: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    defaultChecked: true,
  },
};
