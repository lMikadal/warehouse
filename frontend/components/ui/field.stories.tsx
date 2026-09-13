"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const meta = {
  title: "UI/Field",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FieldSet className="max-w-sm">
      <FieldLegend>Profile</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="field-name">Name</FieldLabel>
          <Input id="field-name" placeholder="Please enter name" />
          <FieldDescription>Shown on invoices.</FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
