"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { DatePicker, type DatePickerSingleProps, type DateRangeValue } from "./date-picker";

const meta = {
  title: "UI/DatePicker",
  component: DatePicker,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<DatePickerSingleProps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { placeholder: "Pick a date", "aria-label": "Date" },
  render: function Render() {
    const [value, setValue] = useState<string | undefined>(undefined);
    return (
      <DatePicker
        value={value}
        onChange={setValue}
        placeholder="Pick a date"
        aria-label="Date"
      />
    );
  },
};

export const WithValue: Story = {
  name: "Pre-filled date",
  args: { placeholder: "Pick a date", "aria-label": "Date" },
  render: function Render() {
    const [value, setValue] = useState<string | undefined>("2026-09-13");
    return (
      <DatePicker
        value={value}
        onChange={setValue}
        placeholder="Pick a date"
        aria-label="Date"
      />
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: "Pick a date", "aria-label": "Date (disabled)" },
  render: function Render() {
    const [value, setValue] = useState<string | undefined>(undefined);
    return (
      <DatePicker
        value={value}
        onChange={setValue}
        placeholder="Pick a date"
        disabled
        aria-label="Date (disabled)"
      />
    );
  },
};

export const RangeEmpty: Story = {
  name: "Range: empty",
  args: { "aria-label": "Date range" },
  render: function Render() {
    const [value, setValue] = useState<DateRangeValue | undefined>(undefined);
    return (
      <DatePicker
        mode="range"
        value={value}
        onChange={setValue}
        placeholder="Pick a date range"
        aria-label="Date range"
      />
    );
  },
};

export const RangePartial: Story = {
  name: "Range: start only",
  args: { "aria-label": "Date range" },
  render: function Render() {
    const [value, setValue] = useState<DateRangeValue>({ from: "2026-09-01" });
    return (
      <DatePicker
        mode="range"
        value={value}
        onChange={(r) => setValue(r ?? {})}
        aria-label="Date range"
      />
    );
  },
};

export const RangeComplete: Story = {
  name: "Range: complete",
  args: { "aria-label": "Date range" },
  render: function Render() {
    const [value, setValue] = useState<DateRangeValue>({
      from: "2026-09-01",
      to: "2026-09-14",
    });
    return (
      <DatePicker
        mode="range"
        value={value}
        onChange={(r) => setValue(r ?? {})}
        aria-label="Date range"
      />
    );
  },
};

export const RangeDisabled: Story = {
  name: "Range: disabled",
  args: { disabled: true, "aria-label": "Date range (disabled)" },
  render: () => (
    <DatePicker
      mode="range"
      value={{ from: "2026-09-01", to: "2026-09-14" }}
      onChange={() => {}}
      disabled
      aria-label="Date range (disabled)"
    />
  ),
};
