"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { ADMIN_NAV_TREE } from "@/lib/admin-menu-mock";

import { AdminBackofficeShell } from "./admin-backoffice-shell";

const meta = {
  title: "Organisms/AdminBackofficeShell",
  component: AdminBackofficeShell,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AdminBackofficeShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const storyUser = { username: "admin" };

export const MenuRoute: Story = {
  name: "Menu breadcrumb",
  args: {
    navTree: ADMIN_NAV_TREE,
    user: storyUser,
    breadcrumbSegments: undefined,
    children: (
      <p className="text-muted-foreground text-sm">
        Placeholder page content (system/menu).
      </p>
    ),
  },
  render: function Render(args) {
    return <AdminBackofficeShell {...args} />;
  },
};

export const CustomBreadcrumb: Story = {
  args: {
    navTree: ADMIN_NAV_TREE,
    user: storyUser,
    breadcrumbSegments: [
      { label: "Super Admin", href: "/admin/system/menu" },
      { label: "Menu" },
    ],
    children: (
      <p className="text-muted-foreground text-sm">Custom breadcrumb override.</p>
    ),
  },
};
