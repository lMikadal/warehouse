"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const meta = {
  title: "UI/Command",
  component: Command,
  tags: ["autodocs"],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command className="max-w-sm rounded-lg border shadow-md">
      <CommandInput placeholder="Search warehouse…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Warehouses">
          <CommandItem>ATW</CommandItem>
          <CommandItem>BKK</CommandItem>
          <CommandItem>CNX</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
