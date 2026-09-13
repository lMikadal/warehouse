import type { Meta, StoryObj } from "@storybook/nextjs";

import { Spinner } from "@/components/ui/spinner";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex justify-center p-4">
      <Spinner />
    </div>
  ),
};
