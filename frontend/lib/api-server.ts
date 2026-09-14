const DEFAULT_API = "http://localhost:1323/api/v1";

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API;
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
  const url = `${apiBaseUrl().replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
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
