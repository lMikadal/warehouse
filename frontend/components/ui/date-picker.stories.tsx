"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { DatePicker } from "./date-picker";

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
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
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
  render: function Render() {
    const [value, setValue] = useState<
      { from?: string; to?: string } | undefined
    >(undefined);
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
  render: function Render() {
    const [value, setValue] = useState<{ from?: string; to?: string }>({
      from: "2026-09-01",
    });
    return (
      <DatePicker
        mode="range"
        value={value}
        onChange={setValue}
        aria-label="Date range"
      />
    );
  },
};

export const RangeComplete: Story = {
  name: "Range: complete",
  render: function Render() {
    const [value, setValue] = useState<{ from?: string; to?: string }>({
      from: "2026-09-01",
      to: "2026-09-14",
    });
    return (
      <DatePicker
        mode="range"
        value={value}
        onChange={setValue}
        aria-label="Date range"
      />
    );
  },
};

export const RangeDisabled: Story = {
  name: "Range: disabled",
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
