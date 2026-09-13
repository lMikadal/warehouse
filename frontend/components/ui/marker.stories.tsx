import type { Meta, StoryObj } from "@storybook/nextjs";

import { Marker, MarkerContent } from "@/components/ui/marker";

const meta = {
  title: "UI/Marker",
  component: Marker,
  tags: ["autodocs"],
} satisfies Meta<typeof Marker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <Marker>
        <MarkerContent>Status note inline with content.</MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>Section break</MarkerContent>
      </Marker>
    </div>
  ),
};
