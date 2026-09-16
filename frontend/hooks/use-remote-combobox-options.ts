"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type RemoteComboboxOption = { value: string; label: string };

export const REMOTE_COMBOBOX_LIMIT = 50;
export const REMOTE_COMBOBOX_DEBOUNCE_MS = 300;

export type RemoteComboboxLoadContext = {
  search: string;
  signal: AbortSignal;
};

function mergeOptions(
  pinned: RemoteComboboxOption[],
  remote: RemoteComboboxOption[]
): RemoteComboboxOption[] {
  const seen = new Set<string>();
  const out: RemoteComboboxOption[] = [];
  for (const item of [...pinned, ...remote]) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    out.push(item);
  }
  return out;
}

export function useRemoteComboboxOptions({
  enabled = true,
  pinnedItems = [],
  value,
  onLoadOptions,
  resolveSelectedLabel,
}: {
  enabled?: boolean;
  pinnedItems?: RemoteComboboxOption[];
  value: string;
  onLoadOptions: (ctx: RemoteComboboxLoadContext) => Promise<RemoteComboboxOption[]>;
  resolveSelectedLabel?: (value: string) => Promise<string | null>;
}) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [remoteItems, setRemoteItems] = useState<RemoteComboboxOption[]>([]);
  const [extraPinned, setExtraPinned] = useState<RemoteComboboxOption[]>([]);
  const onLoadRef = useRef(onLoadOptions);
  useEffect(() => {
    onLoadRef.current = onLoadOptions;
  }, [onLoadOptions]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(inputValue.trim()),
      REMOTE_COMBOBOX_DEBOUNCE_MS
    );
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const rows = await onLoadRef.current({
          search: debouncedSearch,
          signal: controller.signal,
        });
        if (!cancelled) setRemoteItems(rows);
      } catch {
        if (cancelled || controller.signal.aborted) return;
        setRemoteItems([]);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, debouncedSearch, onLoadOptions]);

  useEffect(() => {
    if (!enabled || !value || !resolveSelectedLabel) {
      return;
    }
    const inList = mergeOptions(
      [...pinnedItems, ...extraPinned],
      remoteItems
    ).some((o) => o.value === value);
    if (inList) return;

    let cancelled = false;
    void (async () => {
      try {
        const label = await resolveSelectedLabel(value);
        if (cancelled || !label) return;
        setExtraPinned((prev) => {
          if (prev.some((p) => p.value === value)) return prev;
          return [...prev, { value, label }];
        });
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, value, pinnedItems, extraPinned, remoteItems, resolveSelectedLabel]);

  const items = useMemo(() => {
    if (!enabled) return mergeOptions(pinnedItems, []);
    return mergeOptions([...pinnedItems, ...extraPinned], remoteItems);
  }, [enabled, pinnedItems, extraPinned, remoteItems]);

  const handleInputValueChange = useCallback((next: string) => {
    setInputValue(next);
  }, []);

  const resetInputAfterSelect = useCallback(() => {
    setInputValue("");
    setDebouncedSearch("");
  }, []);

  return {
    items,
    inputValue,
    onInputValueChange: handleInputValueChange,
    resetInputAfterSelect,
  };
}
