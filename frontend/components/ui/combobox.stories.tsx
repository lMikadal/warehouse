"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const warehouses = ["ATW", "BKK", "CNX"];

const meta = {
  title: "UI/Combobox",
  component: Combobox,
  tags: ["autodocs"],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Combobox items={warehouses}>
      <ComboboxInput placeholder="Select warehouse" className="w-[220px]" />
      <ComboboxContent>
        <ComboboxEmpty>No match.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
};
