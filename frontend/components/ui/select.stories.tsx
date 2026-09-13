import type { Meta, StoryObj } from "@storybook/nextjs";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "UI/Select",
  component: Select,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

function SelectDemo({
  disabled,
  size,
}: {
  disabled?: boolean;
  size?: "sm" | "default";
}) {
  return (
    <Select disabled={disabled}>
      <SelectTrigger className="w-52" size={size}>
        <SelectValue placeholder="Please select status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="" disabled>
          Please select status
        </SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>
  );
}

export const Default: Story = {
  render: () => <SelectDemo />,
};

export const WithValue: Story = {
  render: () => (
    <Select defaultValue="active">
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => <SelectDemo disabled />,
};

export const SizeSm: Story = {
  name: "Size: sm",
  render: () => <SelectDemo size="sm" />,
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-52">
        <SelectValue placeholder="Select warehouse" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Zone A</SelectLabel>
          <SelectItem value="a1">Shelf A1</SelectItem>
          <SelectItem value="a2">Shelf A2</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Zone B</SelectLabel>
          <SelectItem value="b1">Shelf B1</SelectItem>
          <SelectItem value="b2">Shelf B2</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
