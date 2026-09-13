"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function sanitizeTel(value: string): string {
  return value.replace(/[^\d-]/g, "")
}

function Input({
  className,
  type,
  inputMode,
  autoComplete,
  onChange,
  onPaste,
  ...props
}: React.ComponentProps<"input">) {
  const isTel = type === "tel"

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isTel) {
      const next = sanitizeTel(e.target.value)
      if (next !== e.target.value) {
        e.target.value = next
      }
    }
    onChange?.(e)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isTel) {
      onPaste?.(e)
      return
    }
    e.preventDefault()
    const pasted = sanitizeTel(e.clipboardData.getData("text"))
    const el = e.currentTarget
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = sanitizeTel(
      el.value.slice(0, start) + pasted + el.value.slice(end)
    )
    el.value = next
    const caret = start + pasted.length
    el.setSelectionRange(caret, caret)
    el.dispatchEvent(new Event("input", { bubbles: true }))
    onPaste?.(e)
  }

  return (
    <InputPrimitive
      type={type}
      inputMode={isTel ? (inputMode ?? "tel") : inputMode}
      autoComplete={isTel ? (autoComplete ?? "tel") : autoComplete}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      onChange={handleChange}
      onPaste={handlePaste}
      {...props}
    />
  )
}

export { Input }
