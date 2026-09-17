"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const comboboxChipsClassName =
  "flex min-h-10 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40";

export function parseCommaTags(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function serializeCommaTags(tags: string[]): string {
  return tags.join(",");
}

function mergeTags(existing: string[], additions: string[]): string[] {
  const seen = new Set(existing);
  const next = [...existing];
  for (const addition of additions) {
    const trimmed = addition.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

export type CommaTagsFieldProps = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
};

export function CommaTagsField({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  invalid = false,
  "aria-label": ariaLabel,
}: CommaTagsFieldProps) {
  const tForm = useTranslations("form");
  const [tags, setTags] = useState(() => parseCommaTags(value));
  const [inputValue, setInputValue] = useState("");
  const lastEmittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (value === lastEmittedRef.current) {
      lastEmittedRef.current = null;
      return;
    }
    setTags(parseCommaTags(value));
    setInputValue("");
  }, [value]);

  const emit = useCallback(
    (nextTags: string[]) => {
      const serialized = serializeCommaTags(nextTags);
      lastEmittedRef.current = serialized;
      setTags(nextTags);
      onChange(serialized);
    },
    [onChange]
  );

  const commitSegments = useCallback(
    (segments: string[], restInput: string) => {
      const additions = segments
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (additions.length) {
        emit(mergeTags(tags, additions));
      }
      setInputValue(restInput);
    },
    [emit, tags]
  );

  const commitInput = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      emit(mergeTags(tags, [trimmed]));
    }
    setInputValue("");
  }, [emit, inputValue, tags]);

  const removeTag = useCallback(
    (index: number) => {
      emit(tags.filter((_, i) => i !== index));
    },
    [emit, tags]
  );

  const onInputChange = (next: string) => {
    if (next.includes(",")) {
      const parts = next.split(",");
      const rest = parts.pop() ?? "";
      commitSegments(parts, rest);
      return;
    }
    setInputValue(next);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes(",")) return;
    e.preventDefault();
    const combined = inputValue + text;
    const parts = combined.split(",");
    const rest = parts.pop() ?? "";
    commitSegments(parts, rest);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitInput();
      return;
    }
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      e.preventDefault();
      emit(tags.slice(0, -1));
    }
  };

  return (
    <div
      role="group"
      aria-invalid={invalid ? true : undefined}
      className={cn(comboboxChipsClassName, disabled && "opacity-50")}
    >
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          data-slot="combobox-chip"
          className="flex h-[calc(--spacing(5.25))] w-fit max-w-full items-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium text-foreground"
        >
          <span className="truncate">{tag}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="-mr-1 size-6 shrink-0 opacity-50 hover:opacity-100"
            disabled={disabled}
            aria-label={tForm("tags.remove", { label: tag })}
            onClick={() => removeTag(index)}
          >
            <XIcon className="size-3.5" />
          </Button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        disabled={disabled}
        aria-label={ariaLabel}
        placeholder={tags.length ? "" : placeholder}
        value={inputValue}
        className="min-w-16 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commitInput}
        onPaste={onPaste}
      />
    </div>
  );
}
