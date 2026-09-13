import type { Meta, StoryObj } from "@storybook/nextjs";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="a" className="w-80">
      <TabsList>
        <TabsTrigger value="a">Overview</TabsTrigger>
        <TabsTrigger value="b">Stock</TabsTrigger>
        <TabsTrigger value="c">History</TabsTrigger>
      </TabsList>
      <TabsContent value="a" className="text-muted-foreground text-sm">
        Overview panel content.
      </TabsContent>
      <TabsContent value="b" className="text-muted-foreground text-sm">
        Stock panel content.
      </TabsContent>
      <TabsContent value="c" className="text-muted-foreground text-sm">
        History panel content.
      </TabsContent>
    </Tabs>
  ),
};

export const LineVariant: Story = {
  name: "Variant: line",
  render: () => (
    <Tabs defaultValue="a" className="w-80">
      <TabsList variant="line">
        <TabsTrigger value="a">Overview</TabsTrigger>
        <TabsTrigger value="b">Stock</TabsTrigger>
        <TabsTrigger value="c">History</TabsTrigger>
      </TabsList>
      <TabsContent value="a" className="text-muted-foreground text-sm">
        Overview panel content.
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="a" className="w-80">
      <TabsList>
        <TabsTrigger value="a">Overview</TabsTrigger>
        <TabsTrigger value="b" disabled>
          Disabled
        </TabsTrigger>
        <TabsTrigger value="c">History</TabsTrigger>
      </TabsList>
      <TabsContent value="a" className="text-muted-foreground text-sm">
        Overview panel content.
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="a" orientation="vertical" className="w-96">
      <TabsList>
        <TabsTrigger value="a">Warehouses</TabsTrigger>
        <TabsTrigger value="b">Zones</TabsTrigger>
        <TabsTrigger value="c">Shelves</TabsTrigger>
      </TabsList>
      <TabsContent value="a" className="text-muted-foreground text-sm">
        Warehouse list panel.
      </TabsContent>
      <TabsContent value="b" className="text-muted-foreground text-sm">
        Zone list panel.
      </TabsContent>
      <TabsContent value="c" className="text-muted-foreground text-sm">
        Shelf list panel.
      </TabsContent>
    </Tabs>
  ),
};

export const ManyTabs: Story = {
  name: "Many tabs",
  render: () => (
    <Tabs defaultValue="1" className="w-96">
      <TabsList>
        {["1", "2", "3", "4", "5"].map((v) => (
          <TabsTrigger key={v} value={v}>
            Tab {v}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="1" className="text-muted-foreground text-sm">
        Panel 1.
      </TabsContent>
    </Tabs>
  ),
};
