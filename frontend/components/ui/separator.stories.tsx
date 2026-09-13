import type { Meta, StoryObj } from "@storybook/nextjs";

import { Separator } from "./separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64 space-y-2">
      <p className="text-sm">Above</p>
      <Separator />
      <p className="text-sm">Below</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-10 items-center gap-3">
      <span className="text-sm">Left</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Right</span>
    </div>
  ),
};

export const BetweenSections: Story = {
  render: () => (
    <div className="w-64 space-y-3">
      <div>
        <p className="font-medium text-sm">Section one</p>
        <p className="text-muted-foreground text-xs">Details here.</p>
      </div>
      <Separator />
      <div>
        <p className="font-medium text-sm">Section two</p>
        <p className="text-muted-foreground text-xs">More details here.</p>
      </div>
    </div>
  ),
};
