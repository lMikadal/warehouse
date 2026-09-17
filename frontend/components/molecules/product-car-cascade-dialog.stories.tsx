"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";

import { AdminBackofficeActorProvider } from "@/lib/admin-backoffice-actor-context";
import type { ProductAttributeRow } from "@/lib/product-attribute-api";

import { ProductCarCascadeDialog } from "./product-car-cascade-dialog";

const storyUser = {
  id: 1,
  username: "storybook",
  type: "admin",
} as const;

const mockRows: ProductAttributeRow[] = [
  {
    id: 101,
    parent_id: null,
    type_car: "brand",
    name: "Toyota",
    sort_order: 1,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 102,
    parent_id: 101,
    type_car: "model",
    name: "Commuter KDH222",
    sort_order: 1,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 103,
    parent_id: 102,
    type_car: "engine",
    name: "3.0 L",
    sort_order: 1,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const messages = {
  productList: {
    viewMoreDetails: "View more details",
    colYear: "Year",
    colGear: "Gear",
    gearManual: "Manual",
    gearAuto: "Automatic",
  },
  productListForm: {
    carDialogTitle: "Select car model",
    carBrandSearchLabel: "Search brand",
    carBrandSearchPlaceholder: "Search brand…",
    carPickBrandFirst: "Select a brand first",
    carPickModelFirst: "Select a model first",
    carYearAdLabel: "Year (AD)",
    yearEnd: "Year end (AD)",
  },
  productAttr: {
    carBrand: "Brand",
    carModel: "Car model",
    carLevel: { engine: "Engine" },
  },
  crud: { btn: { cancel: "Cancel", save: "Save", create: "Add" } },
  form: {
    placeholder: {
      input: "Please enter {label}",
      select: "Please select {label}",
    },
  },
  error: { noData: "No data", required: "Required" },
};

const meta = {
  title: "Molecules/ProductCarCascadeDialog",
  component: ProductCarCascadeDialog,
  decorators: [
    (Story) => (
      <AdminBackofficeActorProvider
        user={storyUser}
        permissionCodes={["product.product_car.view"]}
      >
        <NextIntlClientProvider locale="en" messages={messages}>
          <Story />
        </NextIntlClientProvider>
      </AdminBackofficeActorProvider>
    ),
  ],
} satisfies Meta<typeof ProductCarCascadeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AddMode: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    initial: null,
    onConfirm: () => {},
  },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <ProductCarCascadeDialog
        open={open}
        onOpenChange={setOpen}
        initial={null}
        catalog={mockRows}
        onConfirm={() => setOpen(false)}
      />
    );
  },
};

export const EditMode: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    initial: {
      product_attribute_brand_id: 101,
      product_attribute_model_id: 102,
      product_attribute_engine_id: 103,
      gear_type: "manual",
      year_start: 1998,
      year_end: 2020,
    },
    onConfirm: () => {},
  },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <ProductCarCascadeDialog
        open={open}
        onOpenChange={setOpen}
        initial={{
          product_attribute_brand_id: 101,
          product_attribute_model_id: 102,
          product_attribute_engine_id: 103,
          gear_type: "manual",
          year_start: 1998,
          year_end: 2020,
        }}
        catalog={mockRows}
        onConfirm={() => setOpen(false)}
      />
    );
  },
};
