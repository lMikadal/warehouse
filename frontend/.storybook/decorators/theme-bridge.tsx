"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect } from "react";

function backgroundMode(globals: Record<string, unknown>): "light" | "dark" | null {
  const backgrounds = globals.backgrounds;
  if (backgrounds === "light" || backgrounds === "dark") {
    return backgrounds;
  }
  if (typeof backgrounds === "object" && backgrounds !== null && "value" in backgrounds) {
    const value = (backgrounds as { value: unknown }).value;
    if (value === "light" || value === "dark") return value;
  }
  return null;
}

/** Maps Storybook backgrounds toolbar (Light/Dark) to next-themes for token parity. */
export function StorybookThemeBridge({
  globals,
}: {
  globals: Record<string, unknown>;
}) {
  const { setTheme } = useTheme();
  const mode = backgroundMode(globals);

  useEffect(() => {
    if (!mode) return;
    setTheme(mode);
  }, [mode, setTheme]);

  return null;
}
