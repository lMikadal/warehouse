import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";
import { Input } from "./input";

const meta = {
  title: "UI/Popover",
  component: Popover,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Open popover</PopoverTrigger>
      <PopoverContent className="w-64">
        <PopoverHeader>
          <PopoverTitle>Popover title</PopoverTitle>
          <PopoverDescription>Contextual content in a floating panel.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm: Story = {
  name: "With form content",
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Filter</PopoverTrigger>
      <PopoverContent className="w-64 space-y-3">
        <PopoverHeader>
          <PopoverTitle>Filter options</PopoverTitle>
        </PopoverHeader>
        <div className="space-y-2">
          <Input placeholder="Search keyword" />
          <Button className="w-full">Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const SideBottom: Story = {
  name: "Side: bottom",
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Trigger</PopoverTrigger>
      <PopoverContent side="bottom" className="w-48">
        <p className="text-sm">Bottom popover.</p>
      </PopoverContent>
    </Popover>
  ),
};

export const SideLeft: Story = {
  name: "Side: left",
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Trigger</PopoverTrigger>
      <PopoverContent side="left" className="w-48">
        <p className="text-sm">Left popover.</p>
      </PopoverContent>
    </Popover>
  ),
};
