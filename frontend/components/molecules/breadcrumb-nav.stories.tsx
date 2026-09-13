"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useTranslations } from "next-intl";

import { BreadcrumbNav } from "./breadcrumb-nav";

const meta = {
  title: "Molecules/BreadcrumbNav",
  component: BreadcrumbNav,
} satisfies Meta<typeof BreadcrumbNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WarehouseList: Story = {
  args: {
    segments: [],
  },
  render: function Render() {
    const t = useTranslations("story");
    return (
      <BreadcrumbNav
        segments={[
          { label: t("breadcrumbWarehouse"), href: "/" },
          { label: t("breadcrumbList") },
        ]}
      />
    );
  },
};

export const SingleSegment: Story = {
  args: {
    segments: [{ label: "Warehouses" }],
  },
};

export const TwoSegments: Story = {
  args: {
    segments: [
      { label: "Warehouses", href: "/" },
      { label: "Warehouse A" },
    ],
  },
};

export const DeepPath: Story = {
  args: {
    segments: [
      { label: "Home", href: "/" },
      { label: "Warehouses", href: "/warehouses" },
      { label: "Warehouse A", href: "/warehouses/a" },
      { label: "Zone 1" },
    ],
  },
};

export const Empty: Story = {
  name: "Empty (renders nothing)",
  args: { segments: [] },
};
