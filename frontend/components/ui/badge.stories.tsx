import type { Meta, StoryObj } from "@storybook/nextjs";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
  },
};

export const WarehouseStatus: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge
        className={cn(
          "rounded-full border-transparent",
          "bg-[var(--color-success-bg)] text-[var(--color-success-fg)]"
        )}
      >
        wh-badge active
      </Badge>
      <Badge
        variant="secondary"
        className="rounded-full opacity-80"
      >
        wh-badge inactive
      </Badge>
      <Badge
        className={cn(
          "rounded-full border-transparent",
          "bg-[var(--color-status-active-bg)] text-[var(--color-status-active-fg)]"
        )}
      >
        crud-badge active
      </Badge>
      <Badge
        className={cn(
          "rounded-full border-transparent",
          "bg-[var(--color-status-inactive-bg)] text-[var(--color-status-inactive-fg)]"
        )}
      >
        crud-badge inactive
      </Badge>
    </div>
  ),
};
