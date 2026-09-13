"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { reorderIdsFromSortableEvent } from "@/lib/crud-list-rows";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { GripVertical } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const INITIAL_ITEMS = ["ATW", "BKK", "CNX", "HKT", "UTP"];

function SortableRow({
  id,
  index,
}: {
  id: string;
  index: number;
}) {
  const { ref, handleRef, isDragging } = useSortable({ id, index });

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        ref={handleRef}
        className="inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4 text-current" />
      </button>
      <span className="font-medium">{id}</span>
    </div>
  );
}

function SortableListDemo() {
  const [items, setItems] = useState(INITIAL_ITEMS);

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        setItems((prev) => reorderIdsFromSortableEvent(prev, event) ?? prev);
      }}
    >
      <div className="flex max-w-xs flex-col gap-2">
        {items.map((id, index) => (
          <SortableRow key={id} id={id} index={index} />
        ))}
      </div>
      <p className="mt-4 max-w-md text-xs text-muted-foreground">
        Grip handle only — same pattern planned for CRUD tables with{" "}
        <code className="text-foreground">sort_order</code> (see tables rule).
      </p>
    </DragDropProvider>
  );
}

const meta = {
  title: "Design system/DnD Sortable",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SortableListDemo />,
};
