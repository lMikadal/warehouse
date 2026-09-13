"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
    <Breadcrumb className={cn("text-sm", className)}>
      <BreadcrumbList>
        {segments.map((seg, index) => {
          const isLast = index === segments.length - 1;
          return (
            <span key={`${seg.label}-${index}`} className="contents">
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {seg.href && !isLast ? (
                  <BreadcrumbLink render={<Link href={seg.href} />}>
                    {seg.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{seg.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
