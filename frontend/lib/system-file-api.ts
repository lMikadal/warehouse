import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  parseBffError,
} from "@/lib/bff-crud-client";

export type SystemFilePurpose =
  | "setting_bank_logo"
  | "setting_sale_channel_logo"
  | "product_item_image"
  | "member_avatar"
  | "member_tier_badge"
  | "member_document"
  | "product_attribute_logo";

export type SystemFileItem = {
  id: number;
  bucket: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  purpose: string;
  original_name: string;
  url: string;
  created_at: string;
};

export type ImageUploadItemRemote = {
  kind: "remote";
  id: number;
  url: string;
};

export type ImageUploadItemLocal = {
  kind: "local";
  file: File;
  previewUrl: string;
};

export type ImageUploadItem = ImageUploadItemRemote | ImageUploadItemLocal;

export function imageUploadItemUrl(item: ImageUploadItem): string {
  return item.kind === "remote" ? item.url : item.previewUrl;
}

export function imageUploadItemKey(item: ImageUploadItem): string {
  return item.kind === "remote" ? `r-${item.id}` : `l-${item.previewUrl}`;
}

export function revokeImageUploadItems(items: ImageUploadItem[]): void {
  for (const item of items) {
    if (item.kind === "local") {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
}

export { BffApiError as SystemFileApiError };

const BASE = "/api/v1/auth/proxy/system/files";

/** ponytail: in-memory only; restart clears; no invalidation on upload/delete. */
const systemFileUrlCache = new Map<number, string>();

export async function uploadSystemFile(
  locale: string,
  purpose: SystemFilePurpose | string,
  file: File
): Promise<ImageUploadItemRemote> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("purpose", purpose);
  const res = await authFetch(BASE, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: fd,
  });
  if (!res.ok) throw await parseBffError(res);
  const row = (await res.json()) as SystemFileItem;
  return { kind: "remote", id: row.id, url: row.url };
}

export async function fetchSystemFile(
  locale: string,
  id: number
): Promise<ImageUploadItemRemote> {
  const cached = systemFileUrlCache.get(id);
  if (cached) {
    return { kind: "remote", id, url: cached };
  }
  const res = await authFetch(`${BASE}/${id}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  const row = (await res.json()) as SystemFileItem;
  systemFileUrlCache.set(row.id, row.url);
  return { kind: "remote", id: row.id, url: row.url };
}

export async function deleteSystemFile(locale: string, id: number): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok && res.status !== 204) throw await parseBffError(res);
}

/** Resolve `system_file_id` for setting save (deferred upload). */
export async function resolveSettingLogoFileId(
  locale: string,
  purpose: string,
  items: ImageUploadItem[],
  initialRemoteId: number | null
): Promise<number | null | undefined> {
  if (items.length === 0) {
    return initialRemoteId != null ? null : undefined;
  }
  const first = items[0]!;
  if (first.kind === "local") {
    const remote = await uploadSystemFile(locale, purpose, first.file);
    return remote.id;
  }
  if (first.id === initialRemoteId) {
    return undefined;
  }
  return first.id;
}
