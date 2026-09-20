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

function readStoreSalesResizeLayout(): Record<string, number> | undefined {
  try {
    const raw = window.localStorage.getItem(STORE_SALES_RESIZE_GROUP_ID);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const browse = parsed[STORE_SALES_RESIZE_PANEL.browse];
    const document = parsed[STORE_SALES_RESIZE_PANEL.document];
    if (typeof browse === "number" && typeof document === "number") {
      return parsed;
    }
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
          try {
            window.localStorage.setItem(
              STORE_SALES_RESIZE_GROUP_ID,
              JSON.stringify(layout),
            );
          } catch {
            /* ignore quota / private mode */
          }
        }
      }}
    >
      <ResizablePanel
        id={STORE_SALES_RESIZE_PANEL.browse}
        minSize={32}
        className="min-w-0 overflow-visible! max-h-none!"
      >
        <div className="flex flex-col gap-4 px-1 pr-2 py-2">{browse}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id={STORE_SALES_RESIZE_PANEL.document}
        minSize={26}
        className="min-w-0 h-full overflow-visible! max-h-none!"
      >
        <div className="flex min-w-0 w-full flex-col pl-3 pr-1 py-2">
          {documentPanel}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
