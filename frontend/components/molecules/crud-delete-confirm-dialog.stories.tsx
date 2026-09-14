"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { CrudDeleteConfirmDialog } from "./crud-delete-confirm-dialog";

const meta = {
  title: "Molecules/CrudDeleteConfirmDialog",
  component: CrudDeleteConfirmDialog,
} satisfies Meta<typeof CrudDeleteConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const stubArgs = {
  open: false,
  onOpenChange: () => {},
  onConfirm: () => {},
};

export const Default: Story = {
  args: stubArgs,
  render: function Render() {
    const [open, setOpen] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    return (
      <div className="space-y-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Open delete confirm
        </Button>
        <CrudDeleteConfirmDialog
          open={open}
          onOpenChange={setOpen}
          onConfirm={() => {
            setConfirmed(true);
            setOpen(false);
          }}
        />
        {confirmed ? (
          <p className="text-muted-foreground text-xs">Confirmed delete</p>
        ) : null}
      </div>
    );
  },
};

export const CustomCopy: Story = {
  name: "Custom title and description",
  args: stubArgs,
  render: function Render() {
    const [open, setOpen] = useState(true);

    return (
      <CrudDeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => setOpen(false)}
        title="Delete menu item"
        description="This will remove the menu and all child items. This cannot be undone."
      />
    );
  },
};
