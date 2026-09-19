"use client";

import { CheckIcon, XIcon } from "lucide-react";

import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  type RemoteComboboxLoadContext,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import { useRemoteMultiComboboxOptions } from "@/hooks/use-remote-multi-combobox-options";
import { cn } from "@/lib/utils";

export type { RemoteComboboxOption, RemoteComboboxLoadContext };

export function RemoteMultiComboboxField({
  id,
  label,
  values,
  onValuesChange,
  placeholder,
  emptyLabel,
  inputClassName,
  disabled = false,
  required = false,
  invalid = false,
  errorMessage,
  catalogKey,
  onLoadOptions,
  resolveSelectedLabels,
}: {
  id?: string;
  label: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder: string;
  emptyLabel: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  errorMessage?: string;
  catalogKey?: string | number;
  onLoadOptions: (
    ctx: RemoteComboboxLoadContext
  ) => Promise<RemoteComboboxOption[]>;
  resolveSelectedLabels?: (
    values: string[]
  ) => Promise<RemoteComboboxOption[]>;
}) {
  const anchorRef = useComboboxAnchor();
  const selectedSet = new Set(values);

  const { items, labelFor, onInputValueChange, resetInputAfterSelect } =
    useRemoteMultiComboboxOptions({
      enabled: !disabled,
      values,
      catalogKey,
      onLoadOptions,
      resolveSelectedLabels,
    });

  const toggleValue = (value: string) => {
    if (selectedSet.has(value)) {
      onValuesChange(values.filter((v) => v !== value));
    } else {
      onValuesChange([...values, value]);
    }
    resetInputAfterSelect();
  };

  return (
    <Field className="gap-1.5" data-invalid={invalid ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? (
          <span className="text-[#dc2626]" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </FieldLabel>
      <Combobox
        items={items}
        value={null}
        autoComplete="none"
        onInputValueChange={(next, details) =>
          onInputValueChange(next, details)
        }
        onValueChange={(next) => {
          if (next) toggleValue(next);
        }}
      >
        <div ref={anchorRef} className={cn("w-full", inputClassName)}>
          <ComboboxChips aria-invalid={invalid || undefined}>
            {values.map((value) => (
              <span
                key={value}
                className="flex h-[calc(--spacing(5.25))] w-fit max-w-full items-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium text-foreground"
              >
                <span className="truncate">{labelFor(value)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="-mr-1 size-6 shrink-0 opacity-50 hover:opacity-100"
                  disabled={disabled}
                  aria-label={labelFor(value)}
                  onClick={() => toggleValue(value)}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </span>
            ))}
            <ComboboxChipsInput
              id={id}
              placeholder={values.length ? "" : placeholder}
              aria-label={label}
              disabled={disabled}
            />
          </ComboboxChips>
        </div>
        <ComboboxContent anchor={anchorRef}>
          <ComboboxList>
            {(item) => {
              const picked = selectedSet.has(item.value);
              return (
                <ComboboxItem key={item.value} value={item.value}>
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center",
                      !picked && "invisible"
                    )}
                    aria-hidden
                  >
                    <CheckIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </ComboboxItem>
              );
            }}
          </ComboboxList>
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      {errorMessage ? (
        <FieldError id={id ? `${id}-error` : undefined}>{errorMessage}</FieldError>
      ) : null}
    </Field>
  );
}
