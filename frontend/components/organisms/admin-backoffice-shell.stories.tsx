"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { apiNavTreeToAdminNodes } from "@/lib/admin-nav-api";

import { AdminBackofficeShell } from "./admin-backoffice-shell";

const storyNavTree = apiNavTreeToAdminNodes([
  {
    id: 2,
    icon: "shield-user",
    labels: { th: "ผู้ดูแลระบบสูงสุด", en: "Super Admin" },
    children: [
      {
        id: 3,
        labels: { th: "เมนู", en: "Menu" },
        path: "/admin/system/menu",
      },
    ],
  },
]);

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
    navTree: storyNavTree,
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
    navTree: storyNavTree,
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
