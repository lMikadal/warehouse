import type { Meta, StoryObj } from "@storybook/nextjs";

import { Progress } from "@/components/ui/progress";

const meta = {
  title: "UI/Progress",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Progress value={60} className="max-w-xs" />,
};
