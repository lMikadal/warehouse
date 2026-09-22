"use client";

import type { ReactNode } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * Sticky page action bar for purchase approve/detail/payment/form
 * (same inset pattern as picking / store-sales).
 */
export function PurchasePageFooter({ children }: { children: ReactNode }) {
  const { open: sidebarOpen, isMobile } = useSidebar();
  const footerInsetLeft = !isMobile && sidebarOpen;

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
        footerInsetLeft ? "left-(--sidebar-width)" : "left-0"
      )}
    >
      <div className="mx-auto flex w-full max-w-crud-page flex-wrap justify-end gap-2 px-admin-content py-3">
        {children}
      </div>
    </div>
  );
}
