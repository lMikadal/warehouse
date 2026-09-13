"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import {
  CrudPaginationBar,
  type CrudPaginationMeta,
} from "./crud-pagination-bar";
import type { PageSizeOption } from "@/lib/crud-pagination";

const meta = {
  title: "Molecules/CrudPaginationBar",
  component: CrudPaginationBar,
} satisfies Meta<typeof CrudPaginationBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const metaSample: CrudPaginationMeta = { total: 128, totalPages: 13 };

export const Default: Story = {
  args: {
    page: 1,
    pageSize: 10,
    meta: metaSample,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
  render: function Render() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<PageSizeOption>(10);
    return (
      <CrudPaginationBar
        page={page}
        pageSize={pageSize}
        meta={metaSample}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};

export const EmptyHidden: Story = {
  args: {
    page: 1,
    pageSize: 10,
    meta: { total: 0, totalPages: 1 },
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
  render: () => (
    <CrudPaginationBar
      page={1}
      pageSize={10}
      meta={{ total: 0, totalPages: 1 }}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
    />
  ),
};
