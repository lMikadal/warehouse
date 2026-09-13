"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [checked, setChecked] = useState(true);
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="demo-checkbox"
        checked={checked}
        onCheckedChange={(v) => setChecked(v === true)}
      />
      <Label htmlFor="demo-checkbox">Active</Label>
    </div>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};
