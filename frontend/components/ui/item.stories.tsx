import type { Meta, StoryObj } from "@storybook/nextjs";
import { Pencil, Trash2 } from "lucide-react";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemSeparator,
  ItemTitle,
} from "./item";
import { ButtonIcon } from "./button-icon";

const meta = {
  title: "UI/Item",
  component: Item,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Item className="w-72">
      <ItemContent>
        <ItemTitle>Warehouse A</ItemTitle>
        <ItemDescription>Main storage facility</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const VariantOutline: Story = {
  name: "Variant: outline",
  render: () => (
    <Item variant="outline" className="w-72">
      <ItemContent>
        <ItemTitle>Warehouse B</ItemTitle>
        <ItemDescription>Secondary storage</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const VariantMuted: Story = {
  name: "Variant: muted",
  render: () => (
    <Item variant="muted" className="w-72">
      <ItemContent>
        <ItemTitle>Warehouse C</ItemTitle>
        <ItemDescription>Cold storage</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const SizeSm: Story = {
  name: "Size: sm",
  render: () => (
    <Item variant="outline" size="sm" className="w-64">
      <ItemContent>
        <ItemTitle>Small item</ItemTitle>
      </ItemContent>
    </Item>
  ),
};

export const SizeXs: Story = {
  name: "Size: xs",
  render: () => (
    <Item variant="outline" size="xs" className="w-64">
      <ItemContent>
        <ItemTitle>X-small item</ItemTitle>
      </ItemContent>
    </Item>
  ),
};

export const WithActions: Story = {
  name: "With actions",
  render: () => (
    <Item variant="outline" className="w-72">
      <ItemContent>
        <ItemTitle>Warehouse D</ItemTitle>
        <ItemDescription>Zone 4 · 20 racks</ItemDescription>
      </ItemContent>
      <ItemActions>
        <ButtonIcon size="xs" aria-label="Edit"><Pencil /></ButtonIcon>
        <ButtonIcon size="xs" tone="delete" aria-label="Delete"><Trash2 /></ButtonIcon>
      </ItemActions>
    </Item>
  ),
};

export const GroupWithSeparator: Story = {
  name: "ItemGroup with separator",
  render: () => (
    <ItemGroup className="w-72">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Warehouse A</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Warehouse B</ItemTitle>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Warehouse C</ItemTitle>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

export const WithHeader: Story = {
  name: "ItemHeader",
  render: () => (
    <div className="w-72 space-y-2">
      <ItemHeader>
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Bangkok region
        </span>
      </ItemHeader>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Warehouse A</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Warehouse B</ItemTitle>
        </ItemContent>
      </Item>
    </div>
  ),
};

export const AllVariants: Story = {
  name: "All variants (overview)",
  render: () => (
    <div className="w-72 space-y-2">
      <Item>
        <ItemContent><ItemTitle>Default</ItemTitle></ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent><ItemTitle>Outline</ItemTitle></ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent><ItemTitle>Muted</ItemTitle></ItemContent>
      </Item>
    </div>
  ),
};
