"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildPageItems,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/lib/crud-pagination";
import { cn } from "@/lib/utils";

export type CrudPaginationMeta = {
  total: number;
  totalPages: number;
};

export type CrudPaginationBarProps = {
  page: number;
  pageSize: PageSizeOption;
  meta: CrudPaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
  className?: string;
};

export function CrudPaginationBar({
  page,
  pageSize,
  meta,
  onPageChange,
  onPageSizeChange,
  className,
}: CrudPaginationBarProps) {
  const t = useTranslations("crud");

  if (meta.total === 0) {
    return null;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= meta.totalPages;
  const pageItems = buildPageItems(page, meta.totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn("mt-3", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-table-wrap)] bg-background px-3 py-2">
        <div className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/55">
          <span className="whitespace-nowrap">{t("showItemsPrefix")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              if (v != null) onPageSizeChange(Number(v) as PageSizeOption);
            }}
          >
            <SelectTrigger
              className="w-[4.5rem]"
              aria-label={t("rowsPerPage")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="whitespace-nowrap">{t("showItemsSuffix")}</span>
        </div>

        <PaginationContent
          className="gap-1.5"
          aria-label={t("pageOf", {
            page,
            total: meta.totalPages,
          })}
        >
          <PaginationItem>
            <ButtonIcon
              type="button"
              variant="outline"
              size="md"
              disabled={prevDisabled}
              aria-label={t("prev")}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="text-current" />
            </ButtonIcon>
          </PaginationItem>
          {pageItems.map((item, idx) =>
            item === "..." ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <Button
                  type="button"
                  variant={item === page ? "default" : "ghost"}
                  size="icon-sm"
                  className={cn(
                    "min-w-8",
                    item !== page && "text-foreground/72"
                  )}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <ButtonIcon
              type="button"
              variant="outline"
              size="md"
              disabled={nextDisabled}
              aria-label={t("next")}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="text-current" />
            </ButtonIcon>
          </PaginationItem>
        </PaginationContent>
      </div>
    </nav>
  );
}
