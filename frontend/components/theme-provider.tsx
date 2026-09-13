"use client";

import type { ThemeProviderProps } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { ThemeDocumentSync } from "@/components/theme-mode-switch";

const MEDIA = "(prefers-color-scheme: dark)";
const COLOR_SCHEMES = ["light", "dark"] as const;

type ThemeContextValue = {
  themes: string[];
  forcedTheme?: string;
  theme?: string;
  setTheme: Dispatch<SetStateAction<string>>;
  resolvedTheme?: string;
  systemTheme?: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue>({
  themes: [],
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function readStoredTheme(storageKey: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(storageKey) || fallback;
  } catch {
    return fallback;
  }
}

function getSystemTheme(query?: MediaQueryList | MediaQueryListEvent) {
  const media = query ?? window.matchMedia(MEDIA);
  return media.matches ? "dark" : "light";
}

function disableTransitionOnChange(nonce?: string) {
  const css = document.createElement("style");
  if (nonce) css.setAttribute("nonce", nonce);
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(css);
  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
}

export function ThemeProvider({
  children,
  forcedTheme,
  disableTransitionOnChange: disableTransitions = false,
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  themes = ["light", "dark"],
  defaultTheme = enableSystem ? "system" : "light",
  attribute = "data-theme",
  value,
  nonce,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(() =>
    readStoredTheme(storageKey, defaultTheme),
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const initial = readStoredTheme(storageKey, defaultTheme);
    return initial === "system"
      ? getSystemTheme()
      : (initial as "light" | "dark");
  });

  const classNames = value ? Object.values(value) : themes;

  const applyTheme = useCallback(
    (next: string | undefined) => {
      if (!next || typeof document === "undefined") return;

      let resolved = next;
      if (next === "system" && enableSystem) {
        resolved = getSystemTheme();
      }

      const name = value ? value[resolved] : resolved;
      const enable = disableTransitions ? disableTransitionOnChange(nonce) : null;
      const root = document.documentElement;

      const handleAttribute = (attr: string) => {
        if (attr === "class") {
          root.classList.remove(...classNames);
          if (name) root.classList.add(name);
        } else if (attr.startsWith("data-")) {
          if (name) root.setAttribute(attr, name);
          else root.removeAttribute(attr);
        }
      };

      if (Array.isArray(attribute)) attribute.forEach(handleAttribute);
      else handleAttribute(attribute);

      if (enableColorScheme) {
        const fallback = COLOR_SCHEMES.includes(
          defaultTheme as (typeof COLOR_SCHEMES)[number],
        )
          ? defaultTheme
          : null;
        const colorScheme = COLOR_SCHEMES.includes(
          resolved as (typeof COLOR_SCHEMES)[number],
        )
          ? resolved
          : fallback;
        if (colorScheme) root.style.colorScheme = colorScheme;
      }

      enable?.();
    },
    [
      attribute,
      classNames,
      defaultTheme,
      disableTransitions,
      enableColorScheme,
      enableSystem,
      nonce,
      value,
    ],
  );

  const setTheme = useCallback(
    (update: SetStateAction<string>) => {
      setThemeState((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          // Unsupported
        }
        return next;
      });
    },
    [storageKey],
  );

  const handleMediaQuery = useCallback(
    (event: MediaQueryListEvent | MediaQueryList) => {
      const system = getSystemTheme(event) as "light" | "dark";
      setResolvedTheme(system);
      if (theme === "system" && enableSystem && !forcedTheme) {
        applyTheme("system");
      }
    },
    [applyTheme, enableSystem, forcedTheme, theme],
  );

  useEffect(() => {
    const media = window.matchMedia(MEDIA);
    media.addEventListener("change", handleMediaQuery);
    handleMediaQuery(media);
    return () => media.removeEventListener("change", handleMediaQuery);
  }, [handleMediaQuery]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      if (!event.newValue) setTheme(defaultTheme);
      else setThemeState(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultTheme, setTheme, storageKey]);

  useEffect(() => {
    applyTheme(forcedTheme ?? theme);
    if (theme === "system" && enableSystem) {
      setResolvedTheme(getSystemTheme());
    } else if (theme === "light" || theme === "dark") {
      setResolvedTheme(theme);
    }
  }, [applyTheme, enableSystem, forcedTheme, theme]);

  const providerValue = useMemo(
    (): ThemeContextValue => ({
      theme,
      setTheme,
      forcedTheme,
      resolvedTheme: theme === "system" ? resolvedTheme : theme,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme: enableSystem ? resolvedTheme : undefined,
    }),
    [enableSystem, forcedTheme, resolvedTheme, setTheme, theme, themes],
  );

  return (
    <ThemeContext.Provider value={providerValue}>
      <ThemeDocumentSync />
      {children}
    </ThemeContext.Provider>
  );
}
