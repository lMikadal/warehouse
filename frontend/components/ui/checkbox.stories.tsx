import type { Meta, StoryObj } from "@storybook/nextjs";

import { Checkbox } from "./checkbox";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = { args: {} };

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const Invalid: Story = {
  args: { "aria-invalid": true },
};

export const StatusSuccess: Story = {
  name: "Status: success",
  args: {
    defaultChecked: true,
    className:
      "data-checked:border-success data-checked:bg-success data-checked:text-success-foreground dark:data-checked:bg-success",
  },
};

export const StatusWarning: Story = {
  name: "Status: warning",
  args: {
    defaultChecked: true,
    className:
      "data-checked:border-warning data-checked:bg-warning data-checked:text-warning-foreground dark:data-checked:bg-warning",
  },
};

export const StatusDestructive: Story = {
  name: "Status: destructive",
  args: {
    defaultChecked: true,
    className:
      "data-checked:border-destructive data-checked:bg-destructive data-checked:text-white dark:data-checked:bg-destructive",
  },
};

export const AllStates: Story = {
  name: "All states (overview)",
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox aria-label="Unchecked" />
      <Checkbox defaultChecked aria-label="Checked" />
      <Checkbox disabled aria-label="Disabled" />
      <Checkbox disabled defaultChecked aria-label="Disabled checked" />
    </div>
  ),
};
