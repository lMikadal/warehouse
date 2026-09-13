"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/lib/crud-pagination";

const meta = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

function PageSizeDemo() {
  const [value, setValue] = useState<string>("10");
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v != null) setValue(v);
      }}
    >
      <SelectTrigger className="w-[5.5rem]" aria-label="Rows per page">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAGE_SIZE_OPTIONS.map((n) => (
          <SelectItem key={n} value={String(n)}>
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const PageSize: Story = {
  render: () => <PageSizeDemo />,
};
