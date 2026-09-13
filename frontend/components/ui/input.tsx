"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "cn"

function sanitizeTel(value: string): string {
  if (typeof value !== "string") {
    return ""
  }
  return value.replace(/[^\d-]/g, "")
}

const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

function Input({
  className,
  type,
  inputMode,
  autoComplete,
  onChange,
  onPaste,
  ...props
}: React.ComponentProps<"input">) {
  const t = useTranslations("login")
  const isTel = type === "tel"
  const isPassword = type === "password"
  const [showPassword, setShowPassword] = React.useState(false)

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

  if (isPassword) {
    return (
      <div className="relative flex w-full min-w-0 flex-1">
        <InputPrimitive
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete ?? "current-password"}
          data-slot="input"
          className={cn(inputClassName, "pr-10", className)}
          onChange={handleChange}
          onPaste={handlePaste}
          {...props}
        />
        <button
          type="button"
          className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label={
            showPassword ? t("password.hide") : t("password.show")
          }
          aria-pressed={showPassword}
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? (
            <EyeOff className="size-4 text-current" aria-hidden />
          ) : (
            <Eye className="size-4 text-current" aria-hidden />
          )}
        </button>
      </div>
    )
  }

  return (
    <InputPrimitive
      type={type}
      inputMode={isTel ? (inputMode ?? "tel") : inputMode}
      autoComplete={isTel ? (autoComplete ?? "tel") : autoComplete}
      data-slot="input"
      className={cn(inputClassName, className)}
      onChange={handleChange}
      onPaste={handlePaste}
      {...props}
    />
  )
}

export { Input }
