import type { Meta, StoryObj } from "@storybook/nextjs";

import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Switch } from "./switch";
import { Textarea } from "./textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "./field";

const meta = {
  title: "UI/Field",
  component: Field,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  render: () => (
    <Field orientation="vertical">
      <FieldLabel htmlFor="wh-name">Warehouse name</FieldLabel>
      <Input id="wh-name" placeholder="Enter warehouse name" />
    </Field>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal">
      <FieldLabel htmlFor="wh-status">Status</FieldLabel>
      <Switch id="wh-status" aria-label="Status" />
    </Field>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Field orientation="vertical">
      <FieldLabel htmlFor="wh-loc">Location</FieldLabel>
      <Input id="wh-loc" placeholder="Enter location" />
      <FieldContent>
        <FieldDescription>
          City or address where the warehouse is located.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field orientation="vertical" data-invalid="true">
      <FieldLabel htmlFor="wh-name-err">Warehouse name</FieldLabel>
      <Input id="wh-name-err" aria-invalid placeholder="Enter name" />
      <FieldError>This field is required.</FieldError>
    </Field>
  ),
};

export const Required: Story = {
  render: () => (
    <Field orientation="vertical">
      <FieldLabel htmlFor="wh-req" required>
        Warehouse name
      </FieldLabel>
      <Input id="wh-req" required placeholder="Enter name" />
    </Field>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field orientation="vertical">
      <FieldLabel htmlFor="wh-dis">Warehouse name</FieldLabel>
      <Input id="wh-dis" disabled placeholder="Disabled" />
    </Field>
  ),
};

export const WithTextarea: Story = {
  render: () => (
    <Field orientation="vertical">
      <FieldLabel htmlFor="wh-notes">Notes</FieldLabel>
      <Textarea id="wh-notes" placeholder="Enter notes..." rows={3} />
    </Field>
  ),
};

export const FieldSetExample: Story = {
  name: "FieldSet with FieldGroup",
  render: () => (
    <FieldSet>
      <FieldLegend>Warehouse details</FieldLegend>
      <FieldGroup>
        <Field orientation="vertical">
          <FieldLabel htmlFor="fs-name">Name</FieldLabel>
          <Input id="fs-name" placeholder="Enter name" />
        </Field>
        <Field orientation="vertical">
          <FieldLabel htmlFor="fs-location">Location</FieldLabel>
          <Input id="fs-location" placeholder="Enter location" />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel htmlFor="fs-active">Active</FieldLabel>
          <Switch id="fs-active" aria-label="Active" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};

export const CheckboxField: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="chk-agree" />
      <FieldContent>
        <FieldTitle>
          <label htmlFor="chk-agree">I agree to the terms</label>
        </FieldTitle>
        <FieldDescription>
          By checking this you accept the warehouse terms.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
};
