const DEFAULT_API = "http://localhost:1323/api";

/** Origin + `/api` (no version segment). */
export function apiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API).replace(/\/$/, "");
  return raw.replace(/\/v1$/, "");
}

type BackendFetchOptions = {
  method?: string;
  body?: unknown;
  accessToken?: string;
  locale?: string;
};

export async function backendFetch(
  path: string,
  { method = "GET", body, accessToken, locale = "th" }: BackendFetchOptions = {}
): Promise<Response> {
  const segment = path.replace(/^\//, "").replace(/^v1\//, "");
  const url = `${apiBaseUrl()}/v1/${segment}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": locale,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}

export async function parseApiError(res: Response): Promise<{ code?: string; message?: string }> {
  try {
    return (await res.json()) as { code?: string; message?: string };
  } catch {
    return {};
  }
}
