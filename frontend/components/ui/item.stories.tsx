import type { Meta, StoryObj } from "@storybook/nextjs";
import { Warehouse } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

const meta = {
  title: "UI/Item",
  component: Item,
  tags: ["autodocs"],
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ItemGroup className="max-w-sm">
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Warehouse className="size-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>ATW warehouse</ItemTitle>
          <ItemDescription>Active · 1,240 units</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon-sm">
            ···
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};
