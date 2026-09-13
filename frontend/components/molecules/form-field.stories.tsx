"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { FormField } from "./form-field";

const meta = {
  title: "Molecules/FormField",
  component: FormField,
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "wh-name",
    labelKey: "col.name",
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <FormField
        id="wh-name"
        labelKey="col.name"
        required
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const RequiredValidation: Story = {
  args: {
    id: "wh-name-validated",
    labelKey: "col.name",
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState("");
    const [invalid, setInvalid] = useState(false);

    return (
      <div className="max-w-sm space-y-3">
        <FormField
          id="wh-name-validated"
          labelKey="col.name"
          required
          value={value}
          onChange={setValue}
          invalid={invalid}
          onClearInvalid={() => setInvalid(false)}
        />
        <Button
          type="button"
          onClick={() => {
            if (!value.trim()) {
              setInvalid(true);
              document.getElementById("wh-name-validated")?.focus();
            }
          }}
        >
          Validate
        </Button>
      </div>
    );
  },
};

export const InvalidVisualOnly: Story = {
  name: "Invalid (visual only)",
  args: {
    id: "wh-name-err",
    labelKey: "col.name",
    required: true,
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <div className="max-w-sm">
        <FormField
          id="wh-name-err"
          labelKey="col.name"
          required
          value={value}
          onChange={setValue}
          invalid
        />
      </div>
    );
  },
};

export const OptionalField: Story = {
  name: "Optional (no required)",
  args: {
    id: "wh-opt",
    labelKey: "col.name",
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <div className="max-w-sm">
        <FormField
          id="wh-opt"
          labelKey="col.name"
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const ReadOnly: Story = {
  args: {
    id: "wh-ro",
    labelKey: "col.name",
    value: "Cannot edit",
    onChange: () => {},
    readOnly: true,
  },
};
