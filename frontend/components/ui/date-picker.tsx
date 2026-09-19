"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromIsoDate(iso: string | undefined): Date | undefined {
  return iso ? new Date(`${iso}T12:00:00`) : undefined;
}

export type DateRangeValue = {
  from?: string;
  to?: string;
};

type DatePickerCommonProps = {
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
};

export type DatePickerSingleProps = DatePickerCommonProps & {
  mode?: "single";
  value?: string;
  onChange?: (isoDate: string | undefined) => void;
};

export type DatePickerRangeProps = DatePickerCommonProps & {
  mode: "range";
  value?: DateRangeValue;
  onChange?: (range: DateRangeValue | undefined) => void;
  /** Popover footer; defaults to English for Storybook. */
  confirmLabel?: string;
  cancelLabel?: string;
};

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

function formatRangeLabel(
  value: DateRangeValue | undefined,
  placeholder: string
): string {
  if (!value?.from && !value?.to) return placeholder;
  if (value.from && value.to) return `${value.from} – ${value.to}`;
  if (value.from) return `${value.from} – …`;
  return placeholder;
}

function toRangeValue(range: DateRange | undefined): DateRangeValue | undefined {
  if (!range?.from && !range?.to) return undefined;
  return {
    from: range.from ? toIsoDate(range.from) : undefined,
    to: range.to ? toIsoDate(range.to) : undefined,
  };
}

function fromRangeValue(value: DateRangeValue | undefined): DateRange | undefined {
  if (!value?.from && !value?.to) return undefined;
  return {
    from: fromIsoDate(value.from),
    to: fromIsoDate(value.to),
  };
}

export function DatePicker(props: DatePickerProps) {
  if (props.mode === "range") {
    return <DateRangePickerInner {...props} />;
  }
  return <DateSinglePickerInner {...props} />;
}

function DateSinglePickerInner({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: DatePickerSingleProps) {
  const [open, setOpen] = React.useState(false);
  const selected = fromIsoDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" className="opacity-60" />
        {value ?? placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange?.(date ? toIsoDate(date) : undefined);
            setOpen(false);
          }}
          defaultMonth={selected}
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangePickerInner({
  value,
  onChange,
  placeholder = "Pick a date range",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: DatePickerRangeProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRangeValue | undefined>(value);

  React.useEffect(() => {
    if (!open) {
      setDraft(value);
    }
  }, [open, value]);

  const displayValue = open ? draft : value;
  const selected = fromRangeValue(draft);
  const label = formatRangeLabel(displayValue, placeholder);
  const hasValue = Boolean(displayValue?.from || displayValue?.to);

  const hasCommittedValue = Boolean(value?.from || value?.to);
  const canConfirm =
    Boolean(draft?.from && draft?.to) ||
    (!draft?.from && !draft?.to && hasCommittedValue);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(value);
    } else {
      setDraft(value);
    }
    setOpen(nextOpen);
  };

  const handleCancel = () => {
    setDraft(value);
    setOpen(false);
  };

  const handleConfirm = () => {
    if (!draft?.from && !draft?.to) {
      onChange?.(undefined);
    } else if (draft?.from && draft?.to) {
      onChange?.(draft);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "w-full justify-start text-left font-normal",
              !hasValue && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" className="opacity-60" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          onSelect={(range) => {
            setDraft(toRangeValue(range) ?? undefined);
          }}
          defaultMonth={selected?.from ?? selected?.to}
        />
        <div className="flex justify-end gap-2 border-t p-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
