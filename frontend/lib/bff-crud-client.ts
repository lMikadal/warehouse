import { authFetch } from "@/lib/auth-client";

export class BffApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function parseBffError(res: Response): Promise<BffApiError> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return new BffApiError(
      body.message ?? res.statusText,
      res.status,
      body.code
    );
  } catch {
    return new BffApiError(res.statusText, res.status);
  }
}

export function bffJsonHeaders(locale: string): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": locale,
  };
}

export type BffListMeta = { total: number; page: number; limit: number };

type ListResponse<TItem> = {
  items: TItem[];
  meta: BffListMeta;
};

export type BffStandardListParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sort?: string | null;
  order?: "asc" | "desc" | null;
};

export type AppendListQuery = (qs: URLSearchParams) => void;

export function appendStandardListQuery(
  qs: URLSearchParams,
  params: BffStandardListParams
): void {
  const search = params.search?.trim();
  if (search) qs.set("search", search);
  if (params.isActive !== undefined) {
    qs.set("is_active", params.isActive ? "true" : "false");
  }
  if (params.sort && params.order) {
    qs.set("sort", params.sort);
    qs.set("order", params.order);
  }
}

function buildListUrl(
  basePath: string,
  params: BffStandardListParams,
  appendQuery?: AppendListQuery
): string {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  appendStandardListQuery(qs, params);
  appendQuery?.(qs);
  return `${basePath}?${qs}`;
}

export function createBffCrudClient(basePath: string) {
  return {
    async list<TItem>(
      locale: string,
      params: BffStandardListParams,
      appendQuery?: AppendListQuery
    ): Promise<{ items: TItem[]; meta: BffListMeta }> {
      const url = buildListUrl(basePath, params, appendQuery);
      const res = await authFetch(url, { headers: bffJsonHeaders(locale) });
      if (!res.ok) throw await parseBffError(res);
      const body = (await res.json()) as ListResponse<TItem>;
      return {
        items: body.items ?? [],
        meta: body.meta ?? {
          total: 0,
          page: params.page,
          limit: params.limit,
        },
      };
    },

    async getJson<T>(locale: string, pathSuffix: string): Promise<T> {
      const res = await authFetch(`${basePath}${pathSuffix}`, {
        headers: bffJsonHeaders(locale),
      });
      if (!res.ok) throw await parseBffError(res);
      return (await res.json()) as T;
    },

    async getById<T>(locale: string, id: number): Promise<T> {
      return this.getJson<T>(locale, `/${id}`);
    },

    async create(
      locale: string,
      body: unknown
    ): Promise<{ id: number }> {
      const res = await authFetch(basePath, {
        method: "POST",
        headers: {
          ...bffJsonHeaders(locale),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await parseBffError(res);
      return (await res.json()) as { id: number };
    },

    async patchVoid(
      locale: string,
      id: number,
      body: unknown
    ): Promise<void> {
      const res = await authFetch(`${basePath}/${id}`, {
        method: "PATCH",
        headers: {
          ...bffJsonHeaders(locale),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await parseBffError(res);
    },

    async patchJson<T>(
      locale: string,
      id: number,
      body: unknown
    ): Promise<T> {
      const res = await authFetch(`${basePath}/${id}`, {
        method: "PATCH",
        headers: {
          ...bffJsonHeaders(locale),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await parseBffError(res);
      return (await res.json()) as T;
    },

    async delete(locale: string, id: number): Promise<void> {
      const res = await authFetch(`${basePath}/${id}`, {
        method: "DELETE",
        headers: bffJsonHeaders(locale),
      });
      if (!res.ok) throw await parseBffError(res);
    },

    async reorder(
      locale: string,
      dragId: number,
      targetId: number
    ): Promise<void> {
      const res = await authFetch(`${basePath}/reorder`, {
        method: "PATCH",
        headers: {
          ...bffJsonHeaders(locale),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ drag_id: dragId, target_id: targetId }),
      });
      if (!res.ok) throw await parseBffError(res);
    },
  };
}
