"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { StatusSwitchField } from "./status-switch-field";

const meta = {
  title: "Molecules/StatusSwitchField",
  component: StatusSwitchField,
} satisfies Meta<typeof StatusSwitchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  args: {
    checked: true,
    onCheckedChange: () => {},
  },
  render: function Render() {
    const [checked, setChecked] = useState(true);
    return (
      <StatusSwitchField checked={checked} onCheckedChange={setChecked} />
    );
  },
};

export const Off: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(false);
    return (
      <StatusSwitchField checked={checked} onCheckedChange={setChecked} />
    );
  },
};

export const DisabledOn: Story = {
  name: "Disabled (on)",
  render: () => (
    <StatusSwitchField checked={true} onCheckedChange={() => {}} disabled />
  ),
};

export const DisabledOff: Story = {
  name: "Disabled (off)",
  render: () => (
    <StatusSwitchField checked={false} onCheckedChange={() => {}} disabled />
  ),
};
