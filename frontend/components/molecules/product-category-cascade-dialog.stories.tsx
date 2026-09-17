"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";

import { AdminBackofficeActorProvider } from "@/lib/admin-backoffice-actor-context";
import type { ProductAttributeRow } from "@/lib/product-attribute-api";

import { ProductCategoryCascadeDialog } from "./product-category-cascade-dialog";

const storyUser = {
  id: 1,
  username: "storybook",
  type: "admin",
} as const;

const mockRows: ProductAttributeRow[] = [
  {
    id: 1,
    parent_id: null,
    name: "Parts",
    sort_order: 1,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    parent_id: 1,
    name: "Auto parts",
    sort_order: 1,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 3,
    parent_id: 2,
    name: "Brakes",
    sort_order: 1,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 4,
    parent_id: 3,
    name: "Brake disc",
    sort_order: 1,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 5,
    parent_id: 1,
    name: "Engine",
    sort_order: 2,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const messages = {
  productList: {
    viewMoreDetails: "View more details",
  },
  productListForm: {
    categoryDialogTitle: "Edit product category",
    categorySearchMinHint: "Enter at least one character to search.",
    categorySettingsHint: "How to configure categories",
    categoryCurrentSelection: "Current selection:",
  },
  crud: { btn: { cancel: "Cancel", save: "Save" } },
  search: { placeholder: "Search" },
  error: { noData: "No data" },
};

const meta = {
  title: "Molecules/ProductCategoryCascadeDialog",
  component: ProductCategoryCascadeDialog,
  decorators: [
    (Story) => (
      <AdminBackofficeActorProvider
        user={storyUser}
        permissionCodes={["product.product_category.view"]}
      >
        <NextIntlClientProvider locale="en" messages={messages}>
          <Story />
        </NextIntlClientProvider>
      </AdminBackofficeActorProvider>
    ),
  ],
} satisfies Meta<typeof ProductCategoryCascadeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    valueId: null,
    onConfirm: () => {},
  },
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [selected, setSelected] = useState<string>("—");
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm">Selected: {selected}</p>
        <button
          type="button"
          className="rounded-lg border px-3 py-2 text-sm"
          onClick={() => setOpen(true)}
        >
          Open dialog
        </button>
        <ProductCategoryCascadeDialog
          open={open}
          onOpenChange={setOpen}
          valueId={4}
          loadCategories={async () => mockRows}
          onConfirm={(id, breadcrumb) => {
            setSelected(`${id}: ${breadcrumb}`);
            setOpen(false);
          }}
        />
      </div>
    );
  },
};
