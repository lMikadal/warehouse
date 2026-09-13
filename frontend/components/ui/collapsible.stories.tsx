"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Collapsible defaultOpen className="max-w-sm space-y-2">
      <CollapsibleTrigger render={<Button variant="outline" size="sm" />}>
        Toggle details
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-lg border p-3 text-sm text-muted-foreground">
        Expanded warehouse row or filter panel content.
      </CollapsibleContent>
    </Collapsible>
  ),
};
