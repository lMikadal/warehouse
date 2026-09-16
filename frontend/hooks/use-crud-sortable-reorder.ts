"use client";

import { DragDropProvider } from "@dnd-kit/react";
import {
  type ComponentProps,
  useCallback,
  useState,
} from "react";

type DragEndEvent = Parameters<
  NonNullable<ComponentProps<typeof DragDropProvider>["onDragEnd"]>
>[0];

import {
  reorderIdsFromSortableEvent,
  sortableIndicesFromSource,
} from "@/lib/crud-list-rows";

/** Throw from persistReorder to reset DnD without a generic error toast. */
export class CrudReorderRejectedError extends Error {
  constructor() {
    super("reorder rejected");
    this.name = "CrudReorderRejectedError";
  }
}

export type UseCrudSortableReorderOptions<T extends { id: number }> = {
  rows: T[];
  dragEnabled: boolean;
  /** Apply array move locally before optional persist (nested card lists). */
  applyLocalReorder?: boolean;
  withLocalSortOrder?: (reordered: T[]) => T[];
  onLocalReordered?: (next: T[]) => void;
  persistReorder?: (
    dragId: number,
    targetId: number
  ) => Promise<void | unknown>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export function useCrudSortableReorder<T extends { id: number }>({
  rows,
  dragEnabled,
  applyLocalReorder = false,
  withLocalSortOrder,
  onLocalReordered,
  persistReorder,
  onSuccess,
  onError,
}: UseCrudSortableReorderOptions<T>) {
  const [sortableEpoch, setSortableEpoch] = useState(0);

  const bumpEpoch = useCallback(() => {
    queueMicrotask(() => setSortableEpoch((e) => e + 1));
  }, []);

  const handleDragEnd: ComponentProps<typeof DragDropProvider>["onDragEnd"] =
    useCallback(
      (event: DragEndEvent) => {
        if (event.canceled || !dragEnabled) return;
        const indices = sortableIndicesFromSource(event.operation?.source);
        if (!indices || indices.from === indices.to) {
          bumpEpoch();
          return;
        }
        const dragRow = rows[indices.from];
        const targetRow = rows[indices.to];
        if (!dragRow || !targetRow) {
          bumpEpoch();
          return;
        }

        if (applyLocalReorder) {
          const reordered = reorderIdsFromSortableEvent(rows, event);
          if (!reordered) {
            bumpEpoch();
            return;
          }
          const next = withLocalSortOrder
            ? withLocalSortOrder(reordered)
            : reordered;
          if (!persistReorder) {
            onLocalReordered?.(next);
            onSuccess?.();
            return;
          }
          void persistReorder(dragRow.id, targetRow.id)
            .then(() => {
              onLocalReordered?.(next);
              onSuccess?.();
            })
            .catch((e: unknown) => {
              bumpEpoch();
              onError?.(e);
            });
          return;
        }

        if (!persistReorder) {
          bumpEpoch();
          return;
        }

        void persistReorder(dragRow.id, targetRow.id)
          .then(() => onSuccess?.())
          .catch((e: unknown) => {
            bumpEpoch();
            onError?.(e);
          });
      },
      [
        applyLocalReorder,
        bumpEpoch,
        dragEnabled,
        onError,
        onLocalReordered,
        onSuccess,
        persistReorder,
        rows,
        withLocalSortOrder,
      ]
    );

  return { sortableEpoch, handleDragEnd, bumpEpoch };
}
