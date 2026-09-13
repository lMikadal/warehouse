import type { Meta, StoryObj } from "@storybook/nextjs";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const meta = {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="grid max-w-xs gap-1.5">
      <Label htmlFor="label-demo">Name</Label>
      <Input id="label-demo" placeholder="Please enter name" />
    </div>
  ),
};
