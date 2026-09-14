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
  label,
  value,
  onChange,
  options,
  inputClassName,
  emptyLabel,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: GeoFilterOption[];
  inputClassName: string;
  emptyLabel: string;
  placeholder: string;
  disabled?: boolean;
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
        className={inputClassName}
        placeholder={placeholder}
        aria-label={label}
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
