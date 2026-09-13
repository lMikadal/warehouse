"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

import { ThemeDocumentSync } from "@/components/theme-mode-switch";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeDocumentSync />
      {children}
    </NextThemesProvider>
  );
}
