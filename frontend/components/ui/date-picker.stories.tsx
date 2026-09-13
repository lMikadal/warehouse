"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { DatePicker } from "@/components/ui/date-picker";

const meta = {
  title: "UI/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [value, setValue] = useState<string | undefined>("2026-09-13");
  return (
    <DatePicker
      value={value}
      onChange={setValue}
      placeholder="YYYY-MM-DD"
      className="max-w-xs"
    />
  );
}

export const Default: Story = {
  render: () => <Demo />,
};
