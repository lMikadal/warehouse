"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const TICKET_RESIZE_GROUP_ID = "order-ticket-form-split";
const TICKET_RESIZE_PANEL = {
  main: "order-ticket-main",
  sidebar: "order-ticket-sidebar",
} as const;
const TICKET_RESIZE_DEFAULT_LAYOUT: Record<string, number> = {
  [TICKET_RESIZE_PANEL.main]: 60,
  [TICKET_RESIZE_PANEL.sidebar]: 40,
};

const MIN_MAIN_LAYOUT_PCT = 35;
const MIN_SIDEBAR_LAYOUT_PCT = 30;
const SIDEBAR_PANEL_MIN_PX = 400;

function sanitizeTicketResizeLayout(
  parsed: Record<string, number>,
): Record<string, number> {
  const main = parsed[TICKET_RESIZE_PANEL.main];
  const sidebar = parsed[TICKET_RESIZE_PANEL.sidebar];
  if (typeof main !== "number" || typeof sidebar !== "number") {
    return TICKET_RESIZE_DEFAULT_LAYOUT;
  }
  if (main < MIN_MAIN_LAYOUT_PCT || sidebar < MIN_SIDEBAR_LAYOUT_PCT) {
    return TICKET_RESIZE_DEFAULT_LAYOUT;
  }
  return parsed;
}

function readTicketResizeLayout(): Record<string, number> | undefined {
  try {
    const raw = window.localStorage.getItem(TICKET_RESIZE_GROUP_ID);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return sanitizeTicketResizeLayout(parsed);
  } catch {
    /* ignore corrupt storage */
  }
  return undefined;
}

type Props = {
  main: ReactNode;
  sidebar: ReactNode;
};

export function TicketFormDesktopSplit({ main, sidebar }: Props) {
  const [defaultLayout] = useState(
    () => readTicketResizeLayout() ?? TICKET_RESIZE_DEFAULT_LAYOUT,
  );

  return (
    <ResizablePanelGroup
      id={TICKET_RESIZE_GROUP_ID}
      orientation="horizontal"
      defaultLayout={defaultLayout}
      className="flex w-full items-stretch"
      style={{ height: "auto" }}
      onLayoutChanged={(layout, meta) => {
        if (meta.isUserInteraction) {
          const sanitized = sanitizeTicketResizeLayout(layout);
          try {
            window.localStorage.setItem(
              TICKET_RESIZE_GROUP_ID,
              JSON.stringify(sanitized),
            );
          } catch {
            /* ignore quota / private mode */
          }
        }
      }}
    >
      <ResizablePanel
        id={TICKET_RESIZE_PANEL.main}
        minSize="35%"
        className="min-w-0 overflow-visible! max-h-none!"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden px-1 py-2 pr-2">
          {main}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id={TICKET_RESIZE_PANEL.sidebar}
        minSize={SIDEBAR_PANEL_MIN_PX}
        maxSize="55%"
        className="min-h-0 h-full max-h-none! min-w-0 overflow-visible!"
      >
        <div className="flex h-full min-h-0 w-full min-w-100 flex-col items-stretch gap-4 overflow-x-hidden py-2 pr-1 pl-3">
          {sidebar}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
