"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="active" className="max-w-xs">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="active" id="rg-active" />
        <Label htmlFor="rg-active">Active</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="inactive" id="rg-inactive" />
        <Label htmlFor="rg-inactive">Inactive</Label>
      </div>
    </RadioGroup>
  ),
};
