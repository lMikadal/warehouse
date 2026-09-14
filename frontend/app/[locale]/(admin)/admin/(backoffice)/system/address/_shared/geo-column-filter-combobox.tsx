"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type GeoFilterOption = { value: string; label: string };

export function GeoColumnFilterCombobox({
  id,
  label,
  value,
  onChange,
  options,
  inputClassName,
  emptyLabel,
  placeholder,
  disabled = false,
  invalid = false,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: GeoFilterOption[];
  inputClassName: string;
  emptyLabel: string;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const comboboxValue = value === "" ? null : value;

  return (
    <Combobox
      items={options}
      value={comboboxValue}
      itemToStringLabel={(itemValue) =>
        options.find((o) => o.value === itemValue)?.label ?? ""
      }
      onValueChange={(next) => onChange(next ?? "")}
    >
      <ComboboxInput
        id={id}
        className={inputClassName}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        showClear={value !== ""}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
