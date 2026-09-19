"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useCallback, useState } from "react";

import {
  RemoteMultiComboboxField,
  type RemoteComboboxOption,
} from "./remote-multi-combobox-field";

const ALL: RemoteComboboxOption[] = [
  { value: "1", label: "Toyota" },
  { value: "2", label: "Honda" },
  { value: "3", label: "Mazda" },
  { value: "4", label: "Nissan" },
];

const meta = {
  title: "Molecules/RemoteMultiComboboxField",
  component: RemoteMultiComboboxField,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RemoteMultiComboboxField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MultiSelect: Story = {
  args: {
    label: "Related brands",
    placeholder: "Select brands...",
    emptyLabel: "No results",
    values: [],
    onValuesChange: () => {},
    onLoadOptions: async () => [],
  },
  render: function Render() {
    const [values, setValues] = useState<string[]>(["1"]);
    const loadOptions = useCallback(
      async ({ search }: { search: string; signal: AbortSignal }) => {
        const q = search.toLowerCase();
        return ALL.filter((o) => o.label.toLowerCase().includes(q));
      },
      []
    );
    return (
      <div className="w-72">
        <RemoteMultiComboboxField
          label="Related brands"
          placeholder="Select brands..."
          emptyLabel="No results"
          inputClassName="w-full"
          values={values}
          onValuesChange={setValues}
          onLoadOptions={loadOptions}
          resolveSelectedLabels={async (ids) =>
            ALL.filter((o) => ids.includes(o.value))
          }
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "Related brands",
    placeholder: "Select brands...",
    emptyLabel: "No results",
    values: ["1", "2"],
    disabled: true,
    onValuesChange: () => {},
    onLoadOptions: async () => ALL,
    resolveSelectedLabels: async (ids) =>
      ALL.filter((o) => ids.includes(o.value)),
  },
  render: (args) => (
    <div className="w-72">
      <RemoteMultiComboboxField {...args} inputClassName="w-full" />
    </div>
  ),
};
