import { routing } from "@/i18n/routing";

const REFRESH_URL = "/api/v1/auth/refresh";
const LOGOUT_URL = "/api/v1/auth/logout";

export class SessionExpiredError extends Error {
  constructor() {
    super("session_expired");
    this.name = "SessionExpiredError";
  }
}

let refreshInFlight: Promise<boolean> | null = null;

export async function refreshSessionClient(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    const res = await fetch(REFRESH_URL, {
      method: "POST",
      credentials: "same-origin",
    });
    return res.ok;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || "/";
    }
  }
  return pathname;
}

function loginPathWithCallback(callbackPath?: string): string {
  const base = "/admin/login";
  if (!callbackPath || callbackPath === "/admin/login") {
    return base;
  }
  const qs = new URLSearchParams({ callbackUrl: callbackPath });
  return `${base}?${qs.toString()}`;
}

/** Client-only — redirects via full navigation so locale middleware applies. */
export async function logoutAndRedirectToLogin(options?: {
  /** Omit to use current path; pass `null` for explicit logout (no callback). */
  callbackUrl?: string | null;
}): Promise<void> {
  try {
    await fetch(LOGOUT_URL, { method: "POST", credentials: "same-origin" });
  } catch {
    // Still send the user to login if logout fails (network, etc.).
  }

  if (typeof window === "undefined") {
    return;
  }

  const callbackPath =
    options?.callbackUrl === null
      ? undefined
      : (options?.callbackUrl ??
        stripLocalePrefix(
          `${window.location.pathname}${window.location.search}`
        ));
  window.location.assign(
    callbackPath ? loginPathWithCallback(callbackPath) : "/admin/login"
  );
}

type AuthFetchInit = RequestInit & { _authRetried?: boolean };

export async function authFetch(
  input: RequestInfo | URL,
  init?: AuthFetchInit
): Promise<Response> {
  const { _authRetried, ...fetchInit } = init ?? {};
  const res = await fetch(input, {
    ...fetchInit,
    credentials: fetchInit.credentials ?? "same-origin",
  });

  if (res.status !== 401 || _authRetried) {
    return res;
  }

  const refreshed = await refreshSessionClient();
  if (refreshed) {
    return authFetch(input, { ...fetchInit, _authRetried: true });
  }

  await logoutAndRedirectToLogin();
  throw new SessionExpiredError();
}
