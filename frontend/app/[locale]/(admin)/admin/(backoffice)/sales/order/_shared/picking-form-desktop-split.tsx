"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const PICKING_RESIZE_GROUP_ID = "order-picking-form-split";
const PICKING_RESIZE_PANEL = {
  main: "order-picking-main",
  sidebar: "order-picking-sidebar",
} as const;
const PICKING_RESIZE_DEFAULT_LAYOUT: Record<string, number> = {
  [PICKING_RESIZE_PANEL.main]: 60,
  [PICKING_RESIZE_PANEL.sidebar]: 40,
};

const MIN_MAIN_LAYOUT_PCT = 35;
const MIN_SIDEBAR_LAYOUT_PCT = 30;
const SIDEBAR_PANEL_MIN_PX = 400;

function sanitizePickingResizeLayout(
  parsed: Record<string, number>,
): Record<string, number> {
  const main = parsed[PICKING_RESIZE_PANEL.main];
  const sidebar = parsed[PICKING_RESIZE_PANEL.sidebar];
  if (typeof main !== "number" || typeof sidebar !== "number") {
    return PICKING_RESIZE_DEFAULT_LAYOUT;
  }
  if (main < MIN_MAIN_LAYOUT_PCT || sidebar < MIN_SIDEBAR_LAYOUT_PCT) {
    return PICKING_RESIZE_DEFAULT_LAYOUT;
  }
  return parsed;
}

function readPickingResizeLayout(): Record<string, number> | undefined {
  try {
    const raw = window.localStorage.getItem(PICKING_RESIZE_GROUP_ID);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return sanitizePickingResizeLayout(parsed);
  } catch {
    /* ignore corrupt storage */
  }
  return undefined;
}

type Props = {
  main: ReactNode;
  sidebar: ReactNode;
};

export function PickingFormDesktopSplit({ main, sidebar }: Props) {
  const [defaultLayout] = useState(
    () => readPickingResizeLayout() ?? PICKING_RESIZE_DEFAULT_LAYOUT,
  );

  return (
    <ResizablePanelGroup
      id={PICKING_RESIZE_GROUP_ID}
      orientation="horizontal"
      defaultLayout={defaultLayout}
      className="flex w-full items-stretch"
      style={{ height: "auto" }}
      onLayoutChanged={(layout, meta) => {
        if (meta.isUserInteraction) {
          const sanitized = sanitizePickingResizeLayout(layout);
          try {
            window.localStorage.setItem(
              PICKING_RESIZE_GROUP_ID,
              JSON.stringify(sanitized),
            );
          } catch {
            /* ignore quota / private mode */
          }
        }
      }}
    >
      <ResizablePanel
        id={PICKING_RESIZE_PANEL.main}
        minSize="35%"
        className="min-w-0 overflow-visible! max-h-none!"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden px-1 pr-2 py-2">
          {main}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id={PICKING_RESIZE_PANEL.sidebar}
        minSize={SIDEBAR_PANEL_MIN_PX}
        maxSize="55%"
        className="min-w-0 h-full overflow-visible! max-h-none!"
      >
        <div className="flex h-full min-h-0 w-full min-w-[400px] flex-col items-stretch gap-4 overflow-x-hidden pl-3 pr-1 py-2">
          {sidebar}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
