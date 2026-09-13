"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useTranslations } from "next-intl";
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
    labelKey: "story.sampleField",
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <FormField
        id="wh-name"
        labelKey="story.sampleField"
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
    labelKey: "story.sampleField",
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const t = useTranslations("error");
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    return (
      <div className="max-w-sm space-y-3">
        <FormField
          id="wh-name-validated"
          labelKey="story.sampleField"
          required
          value={value}
          onChange={setValue}
          error={error}
          onClearError={() => setError(null)}
        />
        <Button
          type="button"
          onClick={() => {
            if (!value.trim()) setError(t("required"));
          }}
        >
          Validate
        </Button>
      </div>
    );
  },
};

export const WithPrefilledError: Story = {
  name: "With error (pre-shown)",
  render: function Render() {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>("กรุณากรอกชื่อคลัง");
    return (
      <div className="max-w-sm">
        <FormField
          id="wh-name-err"
          labelKey="story.sampleField"
          required
          value={value}
          onChange={setValue}
          error={error}
          onClearError={() => setError(null)}
        />
      </div>
    );
  },
};

export const OptionalField: Story = {
  name: "Optional (no required)",
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <div className="max-w-sm">
        <FormField
          id="wh-opt"
          labelKey="story.sampleField"
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="max-w-sm">
      <FormField
        id="wh-dis"
        labelKey="story.sampleField"
        value="Cannot edit"
        onChange={() => {}}
      >
        <input
          id="wh-dis"
          disabled
          value="Cannot edit"
          readOnly
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm disabled:opacity-50 disabled:pointer-events-none disabled:bg-input/50"
        />
      </FormField>
    </div>
  ),
};
