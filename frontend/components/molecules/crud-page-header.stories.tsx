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

export const WithoutDescription: Story = {
  args: {
    title: "จัดการคลังสินค้า",
    actions: (
      <Button>
        <Plus />
        เพิ่มคลัง
      </Button>
    ),
  },
};

export const WithoutActions: Story = {
  args: {
    title: "รายงานสต็อก",
    description: "สรุปสต็อกสินค้าทั้งหมด",
  },
};

export const TitleOnly: Story = {
  args: {
    title: "ตั้งค่าระบบ",
  },
};

export const MultipleActions: Story = {
  name: "Multiple actions",
  args: {
    title: "จัดการสินค้า",
    description: "รายการสินค้าทั้งหมดในระบบ",
    actions: (
      <>
        <Button variant="outline">นำเข้า CSV</Button>
        <Button>
          <Plus />
          เพิ่มสินค้า
        </Button>
      </>
    ),
  },
};
