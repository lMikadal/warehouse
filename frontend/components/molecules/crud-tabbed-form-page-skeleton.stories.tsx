import type { Meta, StoryObj } from "@storybook/nextjs";

import { CrudTabbedFormPageSkeleton } from "./crud-tabbed-form-page-skeleton";

const meta = {
  title: "Molecules/CrudTabbedFormPageSkeleton",
  component: CrudTabbedFormPageSkeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CrudTabbedFormPageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SupplierForm: Story = {
  args: {
    showPageHeader: true,
    showFixedFooter: true,
    leftCardCount: 3,
  },
};

export const ProductListFormPricing: Story = {
  args: {
    showPageHeader: true,
    showFixedFooter: true,
    leftCardCount: 3,
    pricingVariantStrips: 2,
  },
};
