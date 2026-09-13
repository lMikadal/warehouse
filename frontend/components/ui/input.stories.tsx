import type { Meta, StoryObj } from "@storybook/nextjs";

import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: "Enter text" } };

export const WithValue: Story = {
  args: { defaultValue: "Warehouse A", placeholder: "Enter text" },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: "Disabled input" },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "Bad value", placeholder: "Invalid" },
};

export const SuccessBorder: Story = {
  name: "State: success",
  args: {
    className:
      "border-success ring-success/30 focus-visible:border-success focus-visible:ring-success/30",
    defaultValue: "Valid value",
  },
};

export const WarningBorder: Story = {
  name: "State: warning",
  args: {
    className:
      "border-warning ring-warning/30 focus-visible:border-warning focus-visible:ring-warning/30",
    defaultValue: "Warning value",
  },
};

export const Search: Story = {
  args: { type: "search", placeholder: "Search" },
};

export const Number: Story = {
  args: { type: "number", placeholder: "0", min: 0 },
};

export const Password: Story = {
  args: { type: "password", placeholder: "Password" },
};

export const Tel: Story = {
  name: "Type: tel",
  args: {
    type: "tel",
    placeholder: "02-1234567",
    defaultValue: "081-2345678",
  },
};
