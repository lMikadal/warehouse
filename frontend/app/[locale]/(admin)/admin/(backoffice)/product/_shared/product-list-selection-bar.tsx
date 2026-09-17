"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type ProductListSelectionBarProps = {
  selectedCount: number;
  pageRowCount: number;
  pageAllSelected: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  busy?: boolean;
  onTogglePage: (checked: boolean) => void;
  onDeselect: () => void;
  onSelectAllPage: () => void;
  onBulkDelete: () => void;
  onBulkDisableSales: () => void;
  onBulkEnableSales: () => void;
};

export function ProductListSelectionBar({
  selectedCount,
  pageRowCount,
  pageAllSelected,
  canDelete,
  canUpdate,
  busy = false,
  onTogglePage,
  onDeselect,
  onSelectAllPage,
  onBulkDelete,
  onBulkDisableSales,
  onBulkEnableSales,
}: ProductListSelectionBarProps) {
  const tList = useTranslations("productList");
  const { open: sidebarOpen, isMobile } = useSidebar();
  const footerInsetLeft = !isMobile && sidebarOpen;

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
        footerInsetLeft ? "left-[var(--sidebar-width)]" : "left-0"
      )}
      role="region"
      aria-label={tList("selectedCount", { count: selectedCount })}
    >
      <div className="mx-auto flex w-full max-w-crud-page flex-wrap items-center justify-between gap-3 px-admin-content py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox
            checked={pageAllSelected}
            disabled={busy || pageRowCount === 0}
            onCheckedChange={(v) => onTogglePage(v === true)}
            aria-label={tList("selectAllPage", { count: pageRowCount })}
          />
          <span className="text-sm font-medium">
            {tList("selectedCount", { count: selectedCount })}
          </span>
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-primary"
            disabled={busy}
            onClick={onDeselect}
          >
            {tList("deselect")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canDelete ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              className={cn("text-destructive border-destructive/40")}
              onClick={onBulkDelete}
            >
              <Trash2 className="size-4" />
              {tList("bulkDelete")}
            </Button>
          ) : null}
          {canUpdate ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={onBulkDisableSales}
              >
                <EyeOff className="size-4" />
                {tList("bulkDisableSales")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={onBulkEnableSales}
              >
                <Eye className="size-4" />
                {tList("bulkEnableSales")}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="link"
            className="h-auto px-2 text-primary"
            disabled={busy || pageRowCount === 0}
            onClick={onSelectAllPage}
          >
            {tList("selectAllPage", { count: pageRowCount })}
          </Button>
        </div>
      </div>
    </div>
  );
}
