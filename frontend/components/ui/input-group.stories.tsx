import type { Meta, StoryObj } from "@storybook/nextjs";
import { Mail, Search, User } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupText,
} from "./input-group";
const meta = {
  title: "UI/InputGroup",
  component: InputGroup,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IconStart: Story = {
  name: "Inline addon: icon start",
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <Mail />
      </InputGroupAddon>
      <InputGroupInput placeholder="Email address" />
    </InputGroup>
  ),
};

export const IconEnd: Story = {
  name: "Inline addon: icon end",
  render: () => (
    <InputGroup>
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon align="inline-end">
        <Search />
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const TextAddonStart: Story = {
  name: "Inline addon: text start",
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <span>https://</span>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
    </InputGroup>
  ),
};

export const TextAddonEnd: Story = {
  name: "Inline addon: text end",
  render: () => (
    <InputGroup>
      <InputGroupInput placeholder="Amount" type="number" />
      <InputGroupAddon align="inline-end">
        <span>THB</span>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const ButtonAddonEnd: Story = {
  name: "Button addon end",
  render: () => (
    <InputGroup>
      <InputGroupInput placeholder="Search warehouses" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" variant="ghost" aria-label="Search">
          <Search />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const BothAddons: Story = {
  name: "Both addons",
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <User />
      </InputGroupAddon>
      <InputGroupInput placeholder="Username" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" variant="ghost" aria-label="Clear">
          ×
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const BlockStart: Story = {
  name: "Block addon: start label",
  render: () => (
    <InputGroup>
      <InputGroupAddon align="block-start" className="border-b">
        <span>Warehouse name</span>
      </InputGroupAddon>
      <InputGroupInput placeholder="Enter name" />
    </InputGroup>
  ),
};

export const WithTextarea: Story = {
  name: "Textarea",
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon align="inline-start">
        <Mail />
      </InputGroupAddon>
      <InputGroupTextarea placeholder="Notes..." rows={3} />
    </InputGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <Mail />
      </InputGroupAddon>
      <InputGroupInput placeholder="Disabled" disabled />
    </InputGroup>
  ),
};

export const TextAddon: Story = {
  name: "ButtonGroupText style",
  render: () => (
    <InputGroup>
      <InputGroupText>
        <User />
        <span>User</span>
      </InputGroupText>
      <InputGroupInput placeholder="Value" />
    </InputGroup>
  ),
};
