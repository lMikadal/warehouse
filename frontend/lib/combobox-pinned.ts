import type { RemoteComboboxOption } from "@/hooks/use-remote-combobox-options";

export function comboboxPinned(
  value: string,
  label: string
): RemoteComboboxOption[] {
  if (!value) return [];
  const trimmed = label.trim();
  if (!trimmed) return [];
  return [{ value, label: trimmed }];
}
