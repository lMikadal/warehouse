import type { Meta, StoryObj } from "@storybook/nextjs";

import { ScrollArea } from "@/components/ui/scroll-area";

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-32 w-48 rounded-lg border p-3">
      <div className="space-y-2 text-sm">
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i}>Row {i + 1}</p>
        ))}
      </div>
    </ScrollArea>
  ),
};
