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
