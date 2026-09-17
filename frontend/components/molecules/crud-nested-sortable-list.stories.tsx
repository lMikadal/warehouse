"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { loadMessages } from "@/messages/load-messages";

import {
  CrudNestedSortableList,
  CrudNestedSortableListItem,
} from "./crud-nested-sortable-list";

type DemoRow = {
  id: number;
  name: string;
  sort_order: number;
};

const seed: DemoRow[] = [
  { id: 1, name: "Alpha", sort_order: 100 },
  { id: 2, name: "Beta", sort_order: 200 },
  { id: 3, name: "Gamma", sort_order: 300 },
];

const meta = {
  title: "Molecules/CrudNestedSortableList",
  component: CrudNestedSortableList,
  args: {
    rows: seed,
    dragEnabled: true,
    emptyLabel: "No rows",
    addLabel: "Add row",
    canManage: true,
    canDelete: true,
    onAdd: () => {},
    onEdit: () => {},
    onDelete: () => {},
    onRowsChange: () => {},
    renderItem: () => null,
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="th" messages={loadMessages("th")}>
        <div className="max-w-xl p-4">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof CrudNestedSortableList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRows: Story = {
  render: function Render() {
    const [rows, setRows] = useState(seed);
    return (
      <CrudNestedSortableList
        rows={rows}
        dragEnabled
        description="Nested card list for tabbed forms."
        emptyLabel="No rows"
        addLabel="Add row"
        canManage
        canDelete
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onRowsChange={setRows}
        renderItem={({ row, index, dragEnabled, actions, onEdit, onDelete }) => (
          <CrudNestedSortableListItem
            key={row.id}
            id={row.id}
            index={index}
            dragEnabled={dragEnabled}
            actions={actions}
            onEdit={onEdit}
            onDelete={onDelete}
          >
            <Avatar className="size-10 shrink-0">
              <AvatarFallback>{row.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 font-medium">{row.name}</div>
          </CrudNestedSortableListItem>
        )}
      />
    );
  },
};

export const ManageWithoutAdd: Story = {
  render: function Render() {
    const [rows, setRows] = useState(seed);
    return (
      <CrudNestedSortableList
        rows={rows}
        dragEnabled
        description="Row edit/delete without header add (e.g. supplier banks when setting_bank.view is missing)."
        emptyLabel="No rows"
        addLabel="Add row"
        canManage
        canAdd={false}
        canDelete
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onRowsChange={setRows}
        renderItem={({ row, index, dragEnabled, actions, onEdit, onDelete }) => (
          <CrudNestedSortableListItem
            key={row.id}
            id={row.id}
            index={index}
            dragEnabled={dragEnabled}
            actions={actions}
            onEdit={onEdit}
            onDelete={onDelete}
          >
            <div className="min-w-0 flex-1 font-medium">{row.name}</div>
          </CrudNestedSortableListItem>
        )}
      />
    );
  },
};

export const Empty: Story = {
  render: function Render() {
    return (
      <CrudNestedSortableList
        rows={[]}
        dragEnabled={false}
        emptyLabel="No contacts yet"
        addLabel="Add contact"
        canManage
        canDelete={false}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onRowsChange={() => {}}
        renderItem={() => null}
      />
    );
  },
};
