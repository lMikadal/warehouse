"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useCallback, useState } from "react";

import {
  RemoteComboboxField,
  type RemoteComboboxOption,
} from "./remote-combobox-field";

const ALL: RemoteComboboxOption[] = Array.from({ length: 120 }, (_, i) => ({
  value: String(i + 1),
  label: `Item ${String(i + 1).padStart(3, "0")}`,
}));

const meta = {
  title: "Molecules/RemoteComboboxField",
  component: RemoteComboboxField,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RemoteComboboxField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RemoteSearch: Story = {
  render: function Render() {
    const [value, setValue] = useState("");
    const loadOptions = useCallback(
      async ({ search }: { search: string; signal: AbortSignal }) => {
        const q = search.toLowerCase();
        const filtered = ALL.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.value.includes(q)
        );
        return filtered.slice(0, 50);
      },
      []
    );
    return (
      <RemoteComboboxField
        label="Warehouse"
        placeholder="Select item..."
        emptyLabel="No results"
        inputClassName="w-56"
        value={value}
        onValueChange={setValue}
        onLoadOptions={loadOptions}
        resolveSelectedLabel={async (id) => {
          const hit = ALL.find((o) => o.value === id);
          return hit?.label ?? null;
        }}
      />
    );
  },
};
