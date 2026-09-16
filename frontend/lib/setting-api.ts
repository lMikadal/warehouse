import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  createBffCrudClient,
  parseBffError,
  type AppendListQuery,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

export type SettingLangSegment =
  | "banks"
  | "payment-methods"
  | "sale-channels"
  | "claim-reasons"
  | "prefixes";

export type SettingLangItem = {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  names?: { th?: string; en?: string };
  is_sale?: boolean;
  is_purchase?: boolean;
  is_default?: boolean;
  is_claim?: boolean;
  is_return?: boolean;
  type?: string;
  code?: string;
  system_file_id?: number | null;
};

export type SettingCodeItem = {
  id: number;
  code: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
};

export type SettingVatItem = {
  id: number;
  vat_type: "exclude" | "include";
  rate: number;
  is_active: boolean;
  updated_at: string;
};

export { BffApiError as SettingApiError };

function langBase(segment: SettingLangSegment): string {
  return `/api/v1/auth/proxy/setting/${segment}`;
}

function langClient(segment: SettingLangSegment) {
  return createBffCrudClient(langBase(segment));
}

const codeClient = createBffCrudClient("/api/v1/auth/proxy/setting/codes");

export type SettingLangListParams = BffStandardListParams & {
  isSale?: boolean;
  isPurchase?: boolean;
  isClaim?: boolean;
  isReturn?: boolean;
  prefixType?: string;
};

function langListAppend(params: SettingLangListParams): AppendListQuery {
  return (qs) => {
    if (params.isSale !== undefined) qs.set("is_sale", params.isSale ? "true" : "false");
    if (params.isPurchase !== undefined) {
      qs.set("is_purchase", params.isPurchase ? "true" : "false");
    }
    if (params.isClaim !== undefined) qs.set("is_claim", params.isClaim ? "true" : "false");
    if (params.isReturn !== undefined) {
      qs.set("is_return", params.isReturn ? "true" : "false");
    }
    if (params.prefixType) qs.set("type", params.prefixType);
  };
}

export async function fetchSettingLangList(
  locale: string,
  segment: SettingLangSegment,
  params: SettingLangListParams
) {
  return langClient(segment).list<SettingLangItem>(
    locale,
    params,
    langListAppend(params)
  );
}

export async function fetchSettingLangById(
  locale: string,
  segment: SettingLangSegment,
  id: number
) {
  return langClient(segment).getById<SettingLangItem>(locale, id);
}

export async function createSettingLang(
  locale: string,
  segment: SettingLangSegment,
  body: Record<string, unknown>
) {
  return langClient(segment).create(locale, body);
}

export async function patchSettingLang(
  locale: string,
  segment: SettingLangSegment,
  id: number,
  body: Record<string, unknown>
) {
  return langClient(segment).patchVoid(locale, id, body);
}

export async function deleteSettingLang(
  locale: string,
  segment: SettingLangSegment,
  id: number
) {
  return langClient(segment).delete(locale, id);
}

export async function reorderSettingLang(
  locale: string,
  segment: SettingLangSegment,
  dragId: number,
  targetId: number,
  extra?: { type?: string }
) {
  const res = await authFetch(`${langBase(segment)}/reorder`, {
    method: "PATCH",
    headers: {
      ...bffJsonHeaders(locale),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      drag_id: dragId,
      target_id: targetId,
      ...(extra?.type ? { type: extra.type } : {}),
    }),
  });
  if (!res.ok) throw await parseBffError(res);
}

export async function fetchSettingCodes(locale: string, params: BffStandardListParams) {
  return codeClient.list<SettingCodeItem>(locale, params);
}

export async function fetchSettingCodeById(locale: string, id: number) {
  return codeClient.getById<SettingCodeItem>(locale, id);
}

export async function createSettingCode(
  locale: string,
  body: { code: string; value: string; is_active: boolean }
) {
  return codeClient.create(locale, body);
}

export async function patchSettingCode(
  locale: string,
  id: number,
  body: Partial<{ code: string; value: string; is_active: boolean }>
) {
  return codeClient.patchVoid(locale, id, body);
}

export async function deleteSettingCode(locale: string, id: number) {
  return codeClient.delete(locale, id);
}

export async function reorderSettingCodes(
  locale: string,
  dragId: number,
  targetId: number
) {
  return codeClient.reorder(locale, dragId, targetId);
}

export async function fetchSettingVat(locale: string) {
  const res = await authFetch("/api/v1/auth/proxy/setting/vat", {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as SettingVatItem;
}

export async function patchSettingVat(
  locale: string,
  id: number,
  body: Partial<{ vat_type: string; rate: number; is_active: boolean }>
) {
  const res = await authFetch(`/api/v1/auth/proxy/setting/vat/${id}`, {
    method: "PATCH",
    headers: {
      ...bffJsonHeaders(locale),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseBffError(res);
}
