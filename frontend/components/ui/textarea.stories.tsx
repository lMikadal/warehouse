import type { Meta, StoryObj } from "@storybook/nextjs";

import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Enter notes...", rows: 3 },
};

export const WithValue: Story = {
  args: { defaultValue: "This is some existing content.", rows: 3 },
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: "Disabled", rows: 3 },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "Error content", rows: 3 },
};

export const Tall: Story = {
  args: { placeholder: "Long notes...", rows: 6 },
};
