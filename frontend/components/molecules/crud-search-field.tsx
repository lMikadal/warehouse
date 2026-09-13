"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CrudSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
};

export function CrudSearchField({
  value,
  onChange,
  className,
  id = "crud-search",
}: CrudSearchFieldProps) {
  const t = useTranslations("search");

  return (
    <div className={cn("relative min-w-[12rem] flex-1", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("placeholder")}
        className="pl-8"
      />
    </div>
  );
}
