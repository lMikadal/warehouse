import type { Meta, StoryObj } from "@storybook/nextjs";

import { Spinner } from "./spinner";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  name: "Size: sm",
  args: { className: "size-3" },
};

export const Large: Story = {
  name: "Size: lg",
  args: { className: "size-8" },
};

export const InButton: Story = {
  render: () => (
    <button
      disabled
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground opacity-70"
    >
      <Spinner className="size-4" />
      Saving…
    </button>
  ),
};

export const AllSizes: Story = {
  name: "All sizes (overview)",
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="size-3" />
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
    </div>
  ),
};
