"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./combobox";

const meta = {
  title: "UI/Combobox",
  component: Combobox,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const WAREHOUSES = [
  { value: "a", label: "Warehouse A" },
  { value: "b", label: "Warehouse B" },
  { value: "c", label: "Warehouse C" },
  { value: "d", label: "Warehouse D" },
  { value: "e", label: "Warehouse E" },
];

export const Default: Story = {
  render: function Render() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Combobox value={value} onValueChange={setValue}>
        <ComboboxInput
          className="w-56"
          placeholder="Select warehouse..."
          aria-label="Warehouse"
        />
        <ComboboxContent>
          <ComboboxList>
            {WAREHOUSES.map((w) => (
              <ComboboxItem key={w.value} value={w.value}>
                {w.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
          <ComboboxEmpty>No results.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    );
  },
};

export const WithClear: Story = {
  name: "With clear button",
  render: function Render() {
    const [value, setValue] = useState<string | null>("b");
    return (
      <Combobox value={value} onValueChange={setValue}>
        <ComboboxInput
          className="w-56"
          placeholder="Select warehouse..."
          aria-label="Warehouse"
          showClear
        />
        <ComboboxContent>
          <ComboboxList>
            {WAREHOUSES.map((w) => (
              <ComboboxItem key={w.value} value={w.value}>
                {w.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
          <ComboboxEmpty>No results.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    );
  },
};

export const Disabled: Story = {
  render: function Render() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Combobox value={value} onValueChange={setValue}>
        <ComboboxInput
          className="w-56"
          placeholder="Disabled..."
          aria-label="Warehouse"
          disabled
        />
        <ComboboxContent>
          <ComboboxList>
            {WAREHOUSES.map((w) => (
              <ComboboxItem key={w.value} value={w.value}>
                {w.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
  },
};

export const EmptyResults: Story = {
  name: "Empty results",
  render: function Render() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Combobox value={value} onValueChange={setValue}>
        <ComboboxInput
          className="w-56"
          placeholder="Type something..."
          aria-label="Warehouse"
        />
        <ComboboxContent>
          <ComboboxList>{/* empty */}</ComboboxList>
          <ComboboxEmpty>No warehouses found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    );
  },
};
