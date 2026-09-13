import type { Meta, StoryObj } from "@storybook/nextjs";
import { Star } from "lucide-react";

import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- variants ---

export const Default: Story = { args: { children: "Default" } };

export const Outline: Story = {
  args: { variant: "outline", children: "Outline" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Ghost" },
};

export const Link: Story = {
  args: { variant: "link", children: "Link" },
};

export const Success: Story = {
  args: { variant: "success", children: "Success" },
};

export const Warning: Story = {
  args: { variant: "warning", children: "Warning" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Destructive" },
};

// --- sizes ---

export const SizeLg: Story = {
  name: "Size: lg",
  args: { size: "lg", children: "Large" },
};

export const SizeSm: Story = {
  name: "Size: sm",
  args: { size: "sm", children: "Small" },
};

export const SizeXs: Story = {
  name: "Size: xs",
  args: { size: "xs", children: "X-Small" },
};

export const SizeIcon: Story = {
  name: "Size: icon",
  args: {
    size: "icon",
    "aria-label": "Star",
    children: <Star />,
  },
};

// --- states ---

export const Disabled: Story = {
  args: { children: "Disabled", disabled: true },
};

export const DisabledOutline: Story = {
  args: { variant: "outline", children: "Disabled outline", disabled: true },
};

// --- with icon ---

export const WithIconStart: Story = {
  name: "With icon (start)",
  args: { children: <><Star data-icon="inline-start" />Save</> },
};

export const WithIconEnd: Story = {
  name: "With icon (end)",
  args: { children: <>Save<Star data-icon="inline-end" /></> },
};

// --- all variants overview ---

export const AllVariants: Story = {
  name: "All variants (overview)",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button>Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  name: "All sizes (overview)",
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="lg">Large</Button>
      <Button>Default</Button>
      <Button size="sm">Small</Button>
      <Button size="xs">X-Small</Button>
      <Button size="icon" aria-label="Star"><Star /></Button>
    </div>
  ),
};
