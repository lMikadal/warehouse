"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "./crud-form-sheet";

const meta = {
  title: "Molecules/CrudFormSheet",
  component: CrudFormSheet,
} satisfies Meta<typeof CrudFormSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");

    return (
      <div>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Open CRUD form sheet
        </Button>
        <CrudFormSheet open={open} onOpenChange={setOpen}>
          <CrudFormSheetHeader title="Edit record" />
          <form
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
          >
            <CrudFormSheetBody>
              <div className="flex flex-col gap-2">
                <Label htmlFor="crud-form-sheet-demo-name">Name</Label>
                <Input
                  id="crud-form-sheet-demo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Please enter name"
                />
              </div>
            </CrudFormSheetBody>
            <CrudFormSheetFooter dismissLabel="Cancel" />
          </form>
        </CrudFormSheet>
      </div>
    );
  },
};
