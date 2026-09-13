import type { Meta, StoryObj } from "@storybook/nextjs";

import { Textarea } from "@/components/ui/textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Textarea className="max-w-sm" placeholder="Please enter notes" rows={4} />
  ),
};
