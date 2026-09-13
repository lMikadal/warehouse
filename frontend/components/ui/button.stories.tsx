import type { Meta, StoryObj } from "@storybook/nextjs";
import { ClipboardList, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "outline",
        "secondary",
        "ghost",
        "destructive",
        "success",
        "warning",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Destructive",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    children: "Success",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "Warning",
  },
};

export const PrimaryWithIcon: Story = {
  render: () => (
    <Button>
      <Plus />
      Add warehouse
    </Button>
  ),
};

export const IconGhost: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" aria-label="View">
        <ClipboardList className="text-current" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-warehouse-action-add hover:text-warehouse-action-add"
        aria-label="Add"
      >
        <Plus className="text-current" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-warehouse-action-delete hover:text-warehouse-action-delete"
        aria-label="Delete"
      >
        <Trash2 className="text-current" />
      </Button>
    </div>
  ),
};
