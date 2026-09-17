"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  REMOTE_COMBOBOX_DEBOUNCE_MS,
  type RemoteComboboxInputChangeDetails,
  type RemoteComboboxLoadContext,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";

const USER_FILTER_INPUT_REASONS = new Set([
  "input-change",
  "input-paste",
  "input-clear",
  "clear-press",
]);

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

export function useRemoteMultiComboboxOptions({
  enabled = true,
  values,
  pinnedItems = [],
  onLoadOptions,
  resolveSelectedLabels,
}: {
  enabled?: boolean;
  values: string[];
  pinnedItems?: RemoteComboboxOption[];
  onLoadOptions: (ctx: RemoteComboboxLoadContext) => Promise<RemoteComboboxOption[]>;
  resolveSelectedLabels?: (values: string[]) => Promise<RemoteComboboxOption[]>;
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
  }, [enabled, debouncedSearch]);

  const items = useMemo(() => {
    const withPinned = mergeOptions(pinnedItems, extraPinned);
    if (!enabled) return withPinned;
    return mergeOptions(withPinned, remoteItems);
  }, [enabled, pinnedItems, extraPinned, remoteItems]);

  useEffect(() => {
    if (!resolveSelectedLabels || values.length === 0) return;
    const inList = new Set(items.map((o) => o.value));
    const missing = values.filter((v) => !inList.has(v));
    if (missing.length === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const resolved = await resolveSelectedLabels(missing);
        if (cancelled || resolved.length === 0) return;
        setExtraPinned((prev) => {
          const have = new Set(prev.map((p) => p.value));
          const add = resolved.filter((r) => !have.has(r.value));
          return add.length ? [...prev, ...add] : prev;
        });
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [values, items, resolveSelectedLabels]);

  const labelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of items) map.set(o.value, o.label);
    return map;
  }, [items]);

  const labelFor = useCallback(
    (value: string) => labelByValue.get(value) ?? value,
    [labelByValue]
  );

  const onInputValueChange = useCallback(
    (next: string, details?: RemoteComboboxInputChangeDetails) => {
      const reason = details?.reason;
      if (reason == null || !USER_FILTER_INPUT_REASONS.has(reason)) {
        return;
      }
      setInputValue(next);
    },
    []
  );

  const resetInputAfterSelect = useCallback(() => {
    setInputValue("");
    setDebouncedSearch("");
  }, []);

  return {
    items,
    labelFor,
    onInputValueChange,
    resetInputAfterSelect,
  };
}
