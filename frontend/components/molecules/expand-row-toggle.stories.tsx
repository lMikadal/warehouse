"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { ExpandRowToggle } from "./expand-row-toggle";

const meta = {
  title: "Molecules/ExpandRowToggle",
  component: ExpandRowToggle,
} satisfies Meta<typeof ExpandRowToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  args: {
    expanded: false,
    onToggle: () => {},
  },
  render: function Render() {
    const [expanded, setExpanded] = useState(false);
    return (
      <ExpandRowToggle
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />
    );
  },
};
