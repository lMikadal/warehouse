"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  useRemoteComboboxOptions,
  type RemoteComboboxLoadContext,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";

export type { RemoteComboboxOption, RemoteComboboxLoadContext };

export function RemoteComboboxField({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  inputClassName,
  disabled = false,
  invalid = false,
  showClear,
  pinnedItems = [],
  catalogKey,
  onLoadOptions,
  resolveSelectedLabel,
  autoComplete = "none",
}: {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  emptyLabel: string;
  inputClassName: string;
  disabled?: boolean;
  invalid?: boolean;
  showClear?: boolean;
  pinnedItems?: RemoteComboboxOption[];
  catalogKey?: string | number;
  autoComplete?: string;
  onLoadOptions: (ctx: RemoteComboboxLoadContext) => Promise<RemoteComboboxOption[]>;
  resolveSelectedLabel?: (value: string) => Promise<string | null>;
}) {
  const comboboxValue = value === "" ? null : value;
  const clearVisible = showClear ?? value !== "";

  const { items, onInputValueChange, resetInputAfterSelect } =
    useRemoteComboboxOptions({
      enabled: !disabled,
      pinnedItems,
      value,
      catalogKey,
      onLoadOptions,
      resolveSelectedLabel,
    });

  return (
    <Combobox
      items={items}
      value={comboboxValue}
      autoComplete={autoComplete}
      filter={null}
      itemToStringLabel={(itemValue) =>
        items.find((o) => o.value === itemValue)?.label ?? ""
      }
      onInputValueChange={(next, details) =>
        onInputValueChange(next, details)
      }
      onValueChange={(next) => {
        onValueChange(next ?? "");
        resetInputAfterSelect();
      }}
    >
      <ComboboxInput
        id={id}
        className={inputClassName}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        showClear={clearVisible}
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
