/** Under `/api/v1/auth/` so nginx dev gateway always hits Next BFF (see infrastructure.md). */
const BFF_LANGUAGES_BASE = "/api/v1/auth/proxy/system/languages";

export type SystemLanguageApiItem = {
  id: number;
  locale: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  updated_at: string;
};

export type SystemLanguageRow = {
  id: number;
  locale: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  updated_at: string;
};

type ListResponse = {
  items: SystemLanguageApiItem[];
  meta: { total: number; page: number; limit: number };
};

export type SystemLanguageListParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sort?: string | null;
  order?: "asc" | "desc" | null;
};

export type SystemLanguageListResult = {
  rows: SystemLanguageRow[];
  meta: { total: number; page: number; limit: number };
};

export class SystemLanguageApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<SystemLanguageApiError> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return new SystemLanguageApiError(
      body.message ?? res.statusText,
      res.status,
      body.code
    );
  } catch {
    return new SystemLanguageApiError(res.statusText, res.status);
  }
}

function bffHeaders(locale: string): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": locale,
  };
}

export function mapApiLanguageToRow(
  item: SystemLanguageApiItem
): SystemLanguageRow {
  return {
    id: item.id,
    locale: item.locale,
    name: item.name,
    sort_order: item.sort_order,
    is_active: item.is_active,
    is_default: item.is_default,
    updated_at: item.updated_at,
  };
}

function buildListQuery(params: SystemLanguageListParams): URLSearchParams {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  const search = params.search?.trim();
  if (search) qs.set("search", search);
  if (params.isActive !== undefined) {
    qs.set("is_active", params.isActive ? "true" : "false");
  }
  if (params.sort && params.order) {
    qs.set("sort", params.sort);
    qs.set("order", params.order);
  }
  return qs;
}

export async function fetchSystemLanguages(
  locale: string,
  params: SystemLanguageListParams
): Promise<SystemLanguageListResult> {
  const url = `${BFF_LANGUAGES_BASE}?${buildListQuery(params)}`;
  const res = await fetch(url, {
    headers: bffHeaders(locale),
    credentials: "same-origin",
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as ListResponse;
  return {
    rows: (body.items ?? []).map(mapApiLanguageToRow),
    meta: body.meta ?? { total: 0, page: params.page, limit: params.limit },
  };
}

export type SystemLanguageCreateBody = {
  locale: string;
  name: string;
  is_active?: boolean;
  is_default?: boolean;
};

export type SystemLanguagePatchBody = {
  locale?: string;
  name?: string;
  is_active?: boolean;
  is_default?: boolean;
};

export async function createSystemLanguage(
  body: SystemLanguageCreateBody,
  locale: string
): Promise<{ id: number }> {
  const res = await fetch(BFF_LANGUAGES_BASE, {
    method: "POST",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { id: number };
}

export async function patchSystemLanguage(
  id: number,
  body: SystemLanguagePatchBody,
  locale: string
): Promise<void> {
  const res = await fetch(`${BFF_LANGUAGES_BASE}/${id}`, {
    method: "PATCH",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function deleteSystemLanguage(
  id: number,
  locale: string
): Promise<void> {
  const res = await fetch(`${BFF_LANGUAGES_BASE}/${id}`, {
    method: "DELETE",
    headers: bffHeaders(locale),
    credentials: "same-origin",
  });
  if (!res.ok) throw await parseError(res);
}

export async function reorderSystemLanguages(
  dragId: number,
  targetId: number,
  locale: string
): Promise<void> {
  const res = await fetch(`${BFF_LANGUAGES_BASE}/reorder`, {
    method: "PATCH",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ drag_id: dragId, target_id: targetId }),
  });
  if (!res.ok) throw await parseError(res);
}
