"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const STORE_SALES_RESIZE_GROUP_ID = "store-sales-form-split";
const STORE_SALES_RESIZE_PANEL = {
  browse: "store-sales-browse",
  document: "store-sales-document",
} as const;
const STORE_SALES_RESIZE_DEFAULT_LAYOUT: Record<string, number> = {
  [STORE_SALES_RESIZE_PANEL.browse]: 60,
  [STORE_SALES_RESIZE_PANEL.document]: 40,
};

/** Persisted layout shares (percent); reject extreme ratios from older bad minSize px config. */
const MIN_BROWSE_LAYOUT_PCT = 35;
/** ~400px document column at 1440px viewport; keeps header + cart table usable. */
const MIN_DOCUMENT_LAYOUT_PCT = 30;
const DOCUMENT_PANEL_MIN_PX = 400;

function sanitizeStoreSalesResizeLayout(
  parsed: Record<string, number>,
): Record<string, number> {
  const browse = parsed[STORE_SALES_RESIZE_PANEL.browse];
  const document = parsed[STORE_SALES_RESIZE_PANEL.document];
  if (typeof browse !== "number" || typeof document !== "number") {
    return STORE_SALES_RESIZE_DEFAULT_LAYOUT;
  }
  if (browse < MIN_BROWSE_LAYOUT_PCT || document < MIN_DOCUMENT_LAYOUT_PCT) {
    return STORE_SALES_RESIZE_DEFAULT_LAYOUT;
  }
  return parsed;
}

function readStoreSalesResizeLayout(): Record<string, number> | undefined {
  try {
    const raw = window.localStorage.getItem(STORE_SALES_RESIZE_GROUP_ID);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return sanitizeStoreSalesResizeLayout(parsed);
  } catch {
    /* ignore corrupt storage */
  }
  return undefined;
}

type Props = {
  browse: ReactNode;
  documentPanel: ReactNode;
};

export function StoreSalesFormDesktopSplit({ browse, documentPanel }: Props) {
  const [defaultLayout] = useState(
    () => readStoreSalesResizeLayout() ?? STORE_SALES_RESIZE_DEFAULT_LAYOUT,
  );

  return (
    <ResizablePanelGroup
      id={STORE_SALES_RESIZE_GROUP_ID}
      orientation="horizontal"
      defaultLayout={defaultLayout}
      className="flex w-full items-stretch"
      style={{ height: "auto" }}
      onLayoutChanged={(layout, meta) => {
        if (meta.isUserInteraction) {
          const sanitized = sanitizeStoreSalesResizeLayout(layout);
          try {
            window.localStorage.setItem(
              STORE_SALES_RESIZE_GROUP_ID,
              JSON.stringify(sanitized),
            );
          } catch {
            /* ignore quota / private mode */
          }
        }
      }}
    >
      <ResizablePanel
        id={STORE_SALES_RESIZE_PANEL.browse}
        minSize="35%"
        className="min-w-0 overflow-visible! max-h-none!"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden px-1 pr-2 py-2">
          {browse}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id={STORE_SALES_RESIZE_PANEL.document}
        minSize={DOCUMENT_PANEL_MIN_PX}
        maxSize="55%"
        className="min-w-0 h-full overflow-visible! max-h-none!"
      >
        <div className="flex h-full min-h-0 w-full min-w-[400px] flex-col items-start overflow-x-hidden pl-3 pr-1 py-2">
          {documentPanel}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
