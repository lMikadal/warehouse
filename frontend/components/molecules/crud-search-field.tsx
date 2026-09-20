"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export type CrudSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function CrudSearchField({
  value,
  onChange,
  className,
  id = "crud-search",
  placeholder,
  disabled = false,
}: CrudSearchFieldProps) {
  const t = useTranslations("search");

  return (
    <InputGroup className={cn("min-w-48 flex-1", className)}>
      <InputGroupAddon align="inline-start">
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("placeholder")}
        disabled={disabled}
      />
    </InputGroup>
  );
}
