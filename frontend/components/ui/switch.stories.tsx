import type { Meta, StoryObj } from "@storybook/nextjs";

import { Switch } from "./switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = { args: {} };

export const On: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledOn: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const SizeSm: Story = {
  name: "Size: sm",
  args: { size: "sm" },
};

export const SizeSmOn: Story = {
  name: "Size: sm (on)",
  args: { size: "sm", defaultChecked: true },
};

export const StatusSuccess: Story = {
  name: "Status: success",
  args: { defaultChecked: true, className: "data-checked:bg-success" },
};

export const StatusWarning: Story = {
  name: "Status: warning",
  args: { defaultChecked: true, className: "data-checked:bg-warning" },
};

export const StatusDestructive: Story = {
  name: "Status: destructive",
  args: { defaultChecked: true, className: "data-checked:bg-destructive" },
};

export const AllStates: Story = {
  name: "All states (overview)",
  render: () => (
    <div className="flex items-center gap-4">
      <Switch aria-label="Off" />
      <Switch defaultChecked aria-label="On" />
      <Switch disabled aria-label="Disabled" />
      <Switch size="sm" aria-label="Small" />
      <Switch size="sm" defaultChecked aria-label="Small on" />
    </div>
  ),
};
