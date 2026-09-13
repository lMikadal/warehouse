import type { Meta, StoryObj } from "@storybook/nextjs";
import { Settings } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";
import { Separator } from "./separator";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Card className="w-72">
      <CardContent>Simple card with just content.</CardContent>
    </Card>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Warehouse A</CardTitle>
        <CardDescription>Main storage facility · Zone 3</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="text-muted-foreground text-sm">
        24 racks · 120 bins · 87% occupied
      </CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  name: "With header action",
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle>Warehouse B</CardTitle>
        <CardDescription>Secondary storage</CardDescription>
        <CardAction>
          <Button size="icon-sm" variant="ghost" aria-label="Settings">
            <Settings />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        12 racks · 60 bins
      </CardContent>
    </Card>
  ),
};

export const SizeSm: Story = {
  name: "Size: sm",
  render: () => (
    <Card className="w-64" size="sm">
      <CardHeader>
        <CardTitle>Small card</CardTitle>
        <CardDescription>Compact variant</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Less padding, smaller layout.
      </CardContent>
    </Card>
  ),
};
