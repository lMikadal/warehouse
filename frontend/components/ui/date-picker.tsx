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
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: DatePickerRangeProps) {
  const [open, setOpen] = React.useState(false);
  const selected = fromRangeValue(value);
  const label = formatRangeLabel(value, placeholder);
  const hasValue = Boolean(value?.from || value?.to);

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
            const next = toRangeValue(range);
            onChange?.(next);
            if (next?.from && next?.to) {
              setOpen(false);
            }
          }}
          defaultMonth={selected?.from ?? selected?.to}
        />
      </PopoverContent>
    </Popover>
  );
}
