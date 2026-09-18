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

export const LastPage: Story = {
  name: "Last page",
  args: {
    page: 13,
    pageSize: 10,
    meta: metaSample,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
  render: function Render() {
    const [page, setPage] = useState(13);
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

export const SinglePage: Story = {
  name: "Single page (≤ pageSize, bar hidden)",
  args: {
    page: 1,
    pageSize: 10,
    meta: { total: 7, totalPages: 1 },
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
  render: () => (
    <CrudPaginationBar
      page={1}
      pageSize={10}
      meta={{ total: 7, totalPages: 1 }}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
    />
  ),
};

const LOT_PAGE_SIZES = [5, 10] as const;
const lotMetaManyPages: CrudPaginationMeta = { total: 450, totalPages: 90 };

export const CustomPageSizes: Story = {
  name: "Custom page sizes (5 / 10, lot modal)",
  args: {
    page: 5,
    pageSize: 10,
    meta: lotMetaManyPages,
    pageSizeOptions: LOT_PAGE_SIZES,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
  render: function Render() {
    const [page, setPage] = useState(5);
    const [pageSize, setPageSize] = useState(10);
    return (
      <CrudPaginationBar
        page={page}
        pageSize={pageSize}
        pageSizeOptions={LOT_PAGE_SIZES}
        meta={lotMetaManyPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};

export const LargePageSize: Story = {
  name: "Large page size (100)",
  args: {
    page: 1,
    pageSize: 100,
    meta: { total: 245, totalPages: 3 },
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
  render: function Render() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<PageSizeOption>(100);
    return (
      <CrudPaginationBar
        page={page}
        pageSize={pageSize}
        meta={{ total: 245, totalPages: 3 }}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};
