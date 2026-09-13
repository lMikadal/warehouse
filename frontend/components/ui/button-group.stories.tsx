import type { Meta, StoryObj } from "@storybook/nextjs";

import { Button } from "./button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "./button-group";

const meta = {
  title: "UI/ButtonGroup",
  component: ButtonGroup,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Left</Button>
      <Button variant="outline">Center</Button>
      <Button variant="outline">Right</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical" className="w-40">
      <Button variant="outline">Top</Button>
      <Button variant="outline">Middle</Button>
      <Button variant="outline">Bottom</Button>
    </ButtonGroup>
  ),
};

export const WithText: Story = {
  name: "With ButtonGroupText",
  render: () => (
    <ButtonGroup>
      <ButtonGroupText>Prefix</ButtonGroupText>
      <Button variant="outline">Action</Button>
    </ButtonGroup>
  ),
};

export const WithSeparator: Story = {
  name: "With separator",
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Save</Button>
      <ButtonGroupSeparator />
      <Button variant="outline">Discard</Button>
    </ButtonGroup>
  ),
};

export const MixedVariants: Story = {
  name: "Mixed variants",
  render: () => (
    <ButtonGroup>
      <Button>Primary</Button>
      <Button variant="outline">Secondary</Button>
    </ButtonGroup>
  ),
};
