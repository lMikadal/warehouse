"use client";

import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export type BreadcrumbNavProps = {
  segments: BreadcrumbSegment[];
  className?: string;
};

export function BreadcrumbNav({ segments, className }: BreadcrumbNavProps) {
  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {segments.map((seg, index) => {
          const isLast = index === segments.length - 1;
          return (
            <Fragment key={`${seg.label}-${index}`}>
              {index > 0 ? (
                <li className="text-muted-foreground" aria-hidden>
                  <ChevronRight className="size-3.5" />
                </li>
              ) : null}
              <li className="inline-flex items-center">
                {seg.href && !isLast ? (
                  <Link
                    href={seg.href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {seg.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      isLast ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {seg.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
