"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, type ChangeEvent } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FormFieldProps = {
  id: string;
  labelKey: string;
  required?: boolean;
  type?: React.ComponentProps<typeof Input>["type"];
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  onClearError?: () => void;
  children?: ReactNode;
  className?: string;
};

export function FormField({
  id,
  labelKey,
  required,
  type = "text",
  value,
  onChange,
  error,
  onClearError,
  children,
  className,
}: FormFieldProps) {
  const t = useTranslations();
  const label = t(labelKey);
  const placeholder = t("form.placeholder.input", { label });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      let next = e.target.value;
      if (type === "tel") {
        next = next.replace(/[^\d-]/g, "");
      }
      onChange(next);
      onClearError?.();
    },
    [onChange, onClearError, type]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (type !== "tel") return;
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/[^\d-]/g, "");
      onChange(value + pasted);
      onClearError?.();
    },
    [onChange, onClearError, type, value]
  );

  return (
    <Field
      data-invalid={error ? true : undefined}
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
          onPaste={handlePaste}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
        />
      )}
      <div className="min-h-[1.25rem]" aria-live="polite">
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    </Field>
  );
}
