import type { Meta, StoryObj } from "@storybook/nextjs";
import { Pencil, Plus, Trash2, Eye } from "lucide-react";

import { ButtonIcon } from "./button-icon";

const meta = {
  title: "UI/ButtonIcon",
  component: ButtonIcon,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ButtonIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- sizes ---

export const SizeXs: Story = {
  name: "Size: xs",
  args: { size: "xs", "aria-label": "Edit", children: <Pencil /> },
};

export const SizeSm: Story = {
  name: "Size: sm (default)",
  args: { size: "sm", "aria-label": "Edit", children: <Pencil /> },
};

export const SizeMd: Story = {
  name: "Size: md",
  args: { size: "md", "aria-label": "Edit", children: <Pencil /> },
};

export const SizeLg: Story = {
  name: "Size: lg",
  args: { size: "lg", "aria-label": "Edit", children: <Pencil /> },
};

// --- tones ---

export const ToneNeutral: Story = {
  name: "Tone: neutral",
  args: { tone: "neutral", "aria-label": "View", children: <Eye /> },
};

export const ToneAdd: Story = {
  name: "Tone: add (green)",
  args: { tone: "add", "aria-label": "Add", children: <Plus /> },
};

export const ToneDelete: Story = {
  name: "Tone: delete (red)",
  args: { tone: "delete", "aria-label": "Delete", children: <Trash2 /> },
};

// --- variants ---

export const VariantOutline: Story = {
  args: { variant: "outline", "aria-label": "Edit", children: <Pencil /> },
};

export const VariantGhost: Story = {
  args: { variant: "ghost", "aria-label": "Edit", children: <Pencil /> },
};

export const Disabled: Story = {
  args: { disabled: true, "aria-label": "Edit", children: <Pencil /> },
};

// --- overview ---

export const AllSizes: Story = {
  name: "All sizes (overview)",
  render: () => (
    <div className="flex items-center gap-3">
      <ButtonIcon size="xs" aria-label="xs"><Pencil /></ButtonIcon>
      <ButtonIcon size="sm" aria-label="sm"><Pencil /></ButtonIcon>
      <ButtonIcon size="md" aria-label="md"><Pencil /></ButtonIcon>
      <ButtonIcon size="lg" aria-label="lg"><Pencil /></ButtonIcon>
    </div>
  ),
};

export const AllTones: Story = {
  name: "All tones (overview)",
  render: () => (
    <div className="flex items-center gap-3">
      <ButtonIcon tone="neutral" aria-label="view"><Eye /></ButtonIcon>
      <ButtonIcon tone="add" aria-label="add"><Plus /></ButtonIcon>
      <ButtonIcon tone="delete" aria-label="delete"><Trash2 /></ButtonIcon>
    </div>
  ),
};
