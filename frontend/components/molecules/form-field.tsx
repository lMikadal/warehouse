"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, type ChangeEvent } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FormFieldProps = {
  id: string;
  labelKey: string;
  required?: boolean;
  type?: React.ComponentProps<typeof Input>["type"];
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  onClearInvalid?: () => void;
  children?: ReactNode;
  className?: string;
  maxLength?: number;
};

export function FormField({
  id,
  labelKey,
  required,
  type = "text",
  value,
  onChange,
  invalid,
  onClearInvalid,
  children,
  className,
  maxLength,
}: FormFieldProps) {
  const t = useTranslations();
  const label = t(labelKey);
  const placeholder = t("form.placeholder.input", { label });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      onClearInvalid?.();
    },
    [onChange, onClearInvalid]
  );

  return (
    <Field
      data-invalid={invalid ? true : undefined}
      className={cn("gap-1.5", className)}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? (
          <span className="text-[#dc2626]" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </FieldLabel>
      {children ?? (
        <Input
          id={id}
          type={type}
          inputMode={type === "tel" ? "tel" : undefined}
          autoComplete={type === "tel" ? "tel" : undefined}
          required={required}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={invalid ? true : undefined}
        />
      )}
    </Field>
  );
}
