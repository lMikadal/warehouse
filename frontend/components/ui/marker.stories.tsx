import type { Meta, StoryObj } from "@storybook/nextjs";
import { Warehouse, MapPin, Package } from "lucide-react";

import { Marker, MarkerContent, MarkerIcon } from "./marker";

const meta = {
  title: "UI/Marker",
  component: Marker,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Marker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Marker>
      <MarkerIcon><Warehouse /></MarkerIcon>
      <MarkerContent>Warehouse A — Zone 3</MarkerContent>
    </Marker>
  ),
};

export const VariantSeparator: Story = {
  name: "Variant: separator",
  render: () => (
    <div className="w-64">
      <Marker variant="separator">
        <MarkerContent>Section title</MarkerContent>
      </Marker>
    </div>
  ),
};

export const VariantBorder: Story = {
  name: "Variant: border",
  render: () => (
    <div className="w-64">
      <Marker variant="border">
        <MarkerIcon><MapPin /></MarkerIcon>
        <MarkerContent>Location: Bangkok</MarkerContent>
      </Marker>
    </div>
  ),
};

export const TextOnly: Story = {
  render: () => (
    <Marker>
      <MarkerContent>Simple text marker</MarkerContent>
    </Marker>
  ),
};

export const WithLink: Story = {
  name: "With link",
  render: () => (
    <Marker>
      <MarkerIcon><Package /></MarkerIcon>
      <MarkerContent>
        <a href="#">View product details</a>
      </MarkerContent>
    </Marker>
  ),
};

export const AllVariants: Story = {
  name: "All variants (overview)",
  render: () => (
    <div className="w-64 space-y-2">
      <Marker>
        <MarkerIcon><Warehouse /></MarkerIcon>
        <MarkerContent>Default variant</MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>Separator variant</MarkerContent>
      </Marker>
      <Marker variant="border">
        <MarkerIcon><MapPin /></MarkerIcon>
        <MarkerContent>Border variant</MarkerContent>
      </Marker>
    </div>
  ),
};
