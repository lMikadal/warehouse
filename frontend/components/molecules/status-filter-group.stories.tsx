"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import {
  StatusFilterGroup,
  type StatusFilterValue,
} from "./status-filter-group";

const meta = {
  title: "Molecules/StatusFilterGroup",
  component: StatusFilterGroup,
} satisfies Meta<typeof StatusFilterGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState<StatusFilterValue>("");
    return <StatusFilterGroup value={value} onChange={setValue} />;
  },
};

export const ActiveSelected: Story = {
  name: "Active selected",
  render: function Render() {
    const [value, setValue] = useState<StatusFilterValue>("active");
    return <StatusFilterGroup value={value} onChange={setValue} />;
  },
};

export const InactiveSelected: Story = {
  name: "Inactive selected",
  render: function Render() {
    const [value, setValue] = useState<StatusFilterValue>("inactive");
    return <StatusFilterGroup value={value} onChange={setValue} />;
  },
};
