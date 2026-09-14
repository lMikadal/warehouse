import {
  BffApiError,
  createBffCrudClient,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

/** Under `/api/v1/auth/` so nginx dev gateway always hits Next BFF (see infrastructure.md). */
const BFF_LANGUAGES_BASE = "/api/v1/auth/proxy/system/languages";
const languageClient = createBffCrudClient(BFF_LANGUAGES_BASE);

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

export type SystemLanguageListParams = BffStandardListParams;

export type SystemLanguageListResult = {
  rows: SystemLanguageRow[];
  meta: { total: number; page: number; limit: number };
};

export { BffApiError as SystemLanguageApiError };

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

export async function fetchSystemLanguages(
  locale: string,
  params: SystemLanguageListParams
): Promise<SystemLanguageListResult> {
  const { items, meta } = await languageClient.list<SystemLanguageApiItem>(
    locale,
    params
  );
  return {
    rows: items.map(mapApiLanguageToRow),
    meta,
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
  return languageClient.create(locale, body);
}

export async function patchSystemLanguage(
  id: number,
  body: SystemLanguagePatchBody,
  locale: string
): Promise<void> {
  return languageClient.patchVoid(locale, id, body);
}

export async function deleteSystemLanguage(
  id: number,
  locale: string
): Promise<void> {
  return languageClient.delete(locale, id);
}

export async function reorderSystemLanguages(
  dragId: number,
  targetId: number,
  locale: string
): Promise<void> {
  return languageClient.reorder(locale, dragId, targetId);
}
