import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>
        Hover me
      </TooltipTrigger>
      <TooltipContent>Short hint text</TooltipContent>
    </Tooltip>
  ),
};

export const SideTop: Story = {
  name: "Side: top",
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>Trigger</TooltipTrigger>
      <TooltipContent side="top">Top tooltip</TooltipContent>
    </Tooltip>
  ),
};

export const SideBottom: Story = {
  name: "Side: bottom",
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>Trigger</TooltipTrigger>
      <TooltipContent side="bottom">Bottom tooltip</TooltipContent>
    </Tooltip>
  ),
};

export const SideLeft: Story = {
  name: "Side: left",
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>Trigger</TooltipTrigger>
      <TooltipContent side="left">Left tooltip</TooltipContent>
    </Tooltip>
  ),
};

export const SideRight: Story = {
  name: "Side: right",
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>Trigger</TooltipTrigger>
      <TooltipContent side="right">Right tooltip</TooltipContent>
    </Tooltip>
  ),
};

export const LongContent: Story = {
  name: "Long content",
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>Hover me</TooltipTrigger>
      <TooltipContent className="max-w-48 text-center">
        This tooltip has a longer description that wraps to multiple lines.
      </TooltipContent>
    </Tooltip>
  ),
};
