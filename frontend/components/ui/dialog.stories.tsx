import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const WithoutCloseButton: Story = {
  name: "No close × button",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>No close button</DialogTitle>
          <DialogDescription>
            Close via the footer buttons only.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Destructive: Story = {
  name: "Destructive confirm",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>Delete item</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete warehouse</DialogTitle>
          <DialogDescription>
            This will permanently delete Warehouse A and all its zones. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const FormDialog: Story = {
  name: "With form content",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button />}>Add warehouse</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add warehouse</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <input
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm placeholder:text-muted-foreground"
            placeholder="Warehouse name"
          />
          <input
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm placeholder:text-muted-foreground"
            placeholder="Location"
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
