import type { Meta, StoryObj } from "@storybook/nextjs";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { ButtonIcon } from "@/components/ui/button-icon";

const meta = {
  title: "UI/ButtonIcon",
  component: ButtonIcon,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
    variant: {
      control: "select",
      options: ["ghost", "outline", "default", "secondary", "destructive"],
    },
    tone: {
      control: "select",
      options: ["neutral", "add", "delete"],
    },
  },
} satisfies Meta<typeof ButtonIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GhostNeutral: Story = {
  args: {
    "aria-label": "Edit",
    children: <Pencil className="text-current" />,
  },
};

export const OutlineMd: Story = {
  args: {
    variant: "outline",
    size: "md",
    "aria-label": "Previous page",
    children: <Pencil className="text-current" />,
  },
};

export const Sizes: Story = {
  args: {
    "aria-label": "Size demo",
    children: <Pencil className="text-current" />,
  },
  render: () => (
    <div className="flex items-center gap-2">
      {(["xs", "sm", "md", "lg"] as const).map((size) => (
        <ButtonIcon key={size} size={size} aria-label={`Size ${size}`}>
          <Pencil className="text-current" />
        </ButtonIcon>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  args: {
    "aria-label": "Tone demo",
    children: <Pencil className="text-current" />,
  },
  render: () => (
    <div className="flex items-center gap-2">
      <ButtonIcon aria-label="Edit">
        <Pencil className="text-current" />
      </ButtonIcon>
      <ButtonIcon tone="add" aria-label="Add">
        <Plus className="text-current" />
      </ButtonIcon>
      <ButtonIcon tone="delete" aria-label="Delete">
        <Trash2 className="text-current" />
      </ButtonIcon>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    "aria-label": "Disabled",
    children: <Pencil className="text-current" />,
  },
};
