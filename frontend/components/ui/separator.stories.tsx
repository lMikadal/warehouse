import type { Meta, StoryObj } from "@storybook/nextjs";

import { Separator } from "@/components/ui/separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-4">
      <div className="text-sm">Above</div>
      <Separator />
      <div className="text-sm">Below</div>
      <div className="flex h-8 items-center gap-2">
        <span className="text-sm">A</span>
        <Separator orientation="vertical" />
        <span className="text-sm">B</span>
      </div>
    </div>
  ),
};
