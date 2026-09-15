import type { Meta, StoryObj } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";

import { loadMessages } from "@/messages/load-messages";

import { AdminRolePermissionMatrix } from "./admin-role-permission-matrix";

const messages = loadMessages("th");

const demoGroups = [
  {
    root_id: 1,
    root_label: "Admin",
    rows: [
      {
        menu_id: 12,
        label: "Users",
        permissions: { view: 13, create: 14, update: 15, delete: 16 },
      },
    ],
  },
];

function MatrixDemo({ locked }: { locked?: boolean }) {
  const [value, setValue] = useState<number[]>([13, 14]);
  return (
    <AdminRolePermissionMatrix
      groups={demoGroups}
      value={value}
      onChange={setValue}
      locked={locked}
    />
  );
}

const meta = {
  title: "Molecules/AdminRolePermissionMatrix",
  component: AdminRolePermissionMatrix,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="th" messages={messages}>
        <div className="max-w-3xl p-4">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof AdminRolePermissionMatrix>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    groups: demoGroups,
    value: [13],
    onChange: () => {},
  },
  render: () => <MatrixDemo />,
};

export const Locked: Story = {
  args: {
    groups: demoGroups,
    value: [13, 14],
    onChange: () => {},
    locked: true,
  },
  render: () => <MatrixDemo locked />,
};
