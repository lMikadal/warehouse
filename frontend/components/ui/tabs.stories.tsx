"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="list" className="max-w-md">
      <TabsList>
        <TabsTrigger value="list">List</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
      </TabsList>
      <TabsContent value="list" className="text-sm text-muted-foreground">
        List tab content.
      </TabsContent>
      <TabsContent value="details" className="text-sm text-muted-foreground">
        Details tab content.
      </TabsContent>
    </Tabs>
  ),
};
