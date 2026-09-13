"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const meta = {
  title: "UI/Resizable",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-[120px] max-w-md rounded-lg border"
    >
      <ResizablePanel defaultSize={50} className="p-3 text-sm">
        Panel A
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50} className="p-3 text-sm">
        Panel B
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
