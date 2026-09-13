"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { Calendar } from "@/components/ui/calendar";

const meta = {
  title: "UI/Calendar",
  component: Calendar,
  tags: ["autodocs"],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [date, setDate] = useState<Date | undefined>(
    new Date("2026-09-13T12:00:00")
  );
  return <Calendar mode="single" selected={date} onSelect={setDate} />;
}

export const Default: Story = {
  render: () => <Demo />,
};
