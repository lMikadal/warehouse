"use client";

import type { ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function TypeIcon({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} aria-hidden>
      {children}
    </span>
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      duration={4000}
      gap={8}
      offset={16}
      closeButton={false}
      richColors={false}
      icons={{
        success: (
          <TypeIcon className="mt-px text-warehouse-action-add">
            <CircleCheck className="size-5" strokeWidth={2} />
          </TypeIcon>
        ),
        error: (
          <TypeIcon className="mt-px text-destructive">
            <CircleAlert className="size-5" strokeWidth={2} />
          </TypeIcon>
        ),
        warning: (
          <TypeIcon className="mt-px text-warehouse-warning">
            <TriangleAlert className="size-5" strokeWidth={2} />
          </TypeIcon>
        ),
        info: (
          <TypeIcon className="mt-px text-primary">
            <Info className="size-5" strokeWidth={2} />
          </TypeIcon>
        ),
        loading: (
          <TypeIcon className="mt-px text-primary">
            <Loader2 className="size-5 animate-spin" strokeWidth={2} />
          </TypeIcon>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster };
