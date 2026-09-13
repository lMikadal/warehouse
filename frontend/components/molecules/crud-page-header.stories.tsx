import type { Meta, StoryObj } from "@storybook/nextjs";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CrudPageHeader } from "./crud-page-header";

const meta = {
  title: "Molecules/CrudPageHeader",
  component: CrudPageHeader,
} satisfies Meta<typeof CrudPageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WarehouseList: Story = {
  args: {
    title: "จัดการคลังสินค้า",
    description: "รายการคลังและโซนพร้อมสถานะใช้งาน",
    actions: (
      <Button>
        <Plus />
        เพิ่มคลังสินค้า
      </Button>
    ),
  },
};
