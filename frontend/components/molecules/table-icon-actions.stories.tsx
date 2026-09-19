"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { TableIconActions } from "./table-icon-actions";

const meta = {
  title: "Molecules/TableIconActions",
  component: TableIconActions,
} satisfies Meta<typeof TableIconActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WarehouseRow: Story = {
  args: {
    actions: ["view", "add", "delete"],
  },
};

export const ZoneCard: Story = {
  args: {
    actions: ["view", "edit", "delete"],
  },
};

export const EditDelete: Story = {
  name: "Edit + Delete",
  args: {
    actions: ["edit", "delete"],
  },
};

export const DeleteDisabled: Story = {
  name: "Delete disabled",
  args: {
    actions: ["edit", "delete"],
    disabledActions: ["delete"],
  },
};

export const ViewOnly: Story = {
  name: "View only",
  args: {
    actions: ["view"],
  },
};

export const ViewEditDelete: Story = {
  name: "View + Edit + Delete",
  args: {
    actions: ["view", "edit", "delete"],
  },
};

export const AllFour: Story = {
  name: "All four actions",
  args: {
    actions: ["view", "edit", "add", "delete"],
  },
};

export const WithCallback: Story = {
  name: "With onAction callback",
  args: {
    actions: ["view", "edit", "delete"],
    onAction: () => {},
  },
  render: function Render() {
    const [last, setLast] = useState<string | null>(null);
    return (
      <div className="space-y-2">
        <TableIconActions
          actions={["view", "edit", "delete"]}
          onAction={(action) => setLast(action)}
        />
        {last && (
          <p className="text-muted-foreground text-xs">Last: {last}</p>
        )}
      </div>
    );
  },
};
