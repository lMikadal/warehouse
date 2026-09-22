"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const RECEIVE_RESIZE_GROUP_ID = "purchase-ticket-receive-split";
const RECEIVE_RESIZE_PANEL = {
  left: "purchase-ticket-receive-left",
  right: "purchase-ticket-receive-right",
} as const;
const RECEIVE_RESIZE_DEFAULT_LAYOUT: Record<string, number> = {
  [RECEIVE_RESIZE_PANEL.left]: 58,
  [RECEIVE_RESIZE_PANEL.right]: 42,
};

const MIN_LEFT_LAYOUT_PCT = 35;
const MIN_RIGHT_LAYOUT_PCT = 30;
/** Right rail min width in px at typical desktop viewport. */
const RIGHT_PANEL_MIN_PX = 320;

function sanitizeReceiveResizeLayout(
  parsed: Record<string, number>
): Record<string, number> {
  const left = parsed[RECEIVE_RESIZE_PANEL.left];
  const right = parsed[RECEIVE_RESIZE_PANEL.right];
  if (typeof left !== "number" || typeof right !== "number") {
    return RECEIVE_RESIZE_DEFAULT_LAYOUT;
  }
  if (left < MIN_LEFT_LAYOUT_PCT || right < MIN_RIGHT_LAYOUT_PCT) {
    return RECEIVE_RESIZE_DEFAULT_LAYOUT;
  }
  return parsed;
}

function readReceiveResizeLayout(): Record<string, number> | undefined {
  try {
    const raw = window.localStorage.getItem(RECEIVE_RESIZE_GROUP_ID);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return sanitizeReceiveResizeLayout(parsed);
  } catch {
    /* ignore corrupt storage */
  }
  return undefined;
}

type Props = {
  left: ReactNode;
  right: ReactNode;
};

export function PurchaseTicketReceiveDesktopSplit({ left, right }: Props) {
  const [defaultLayout] = useState(
    () => readReceiveResizeLayout() ?? RECEIVE_RESIZE_DEFAULT_LAYOUT
  );

  return (
    <ResizablePanelGroup
      id={RECEIVE_RESIZE_GROUP_ID}
      orientation="horizontal"
      defaultLayout={defaultLayout}
      className="flex h-[min(85vh,56rem)] min-h-[480px] w-full items-stretch"
      style={{ height: "auto" }}
      onLayoutChanged={(layout, meta) => {
        if (meta.isUserInteraction) {
          const sanitized = sanitizeReceiveResizeLayout(layout);
          try {
            window.localStorage.setItem(
              RECEIVE_RESIZE_GROUP_ID,
              JSON.stringify(sanitized)
            );
          } catch {
            /* ignore quota / private mode */
          }
        }
      }}
    >
      <ResizablePanel
        id={RECEIVE_RESIZE_PANEL.left}
        // Percent min so the ticket table stays readable.
        minSize="35%"
        className="min-w-0 overflow-visible! max-h-none!"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden pr-2">
          {left}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle className="mx-1" />
      <ResizablePanel
        id={RECEIVE_RESIZE_PANEL.right}
        // Pixel floor for draft/PO cards; max keeps left column usable.
        minSize={RIGHT_PANEL_MIN_PX}
        maxSize="55%"
        className="min-w-0 overflow-visible! max-h-none!"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden pl-2">
          {right}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
