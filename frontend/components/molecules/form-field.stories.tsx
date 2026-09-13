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
