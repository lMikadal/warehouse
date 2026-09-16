import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  createBffCrudClient,
  parseBffError,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

const BFF_BASE = "/api/v1/auth/proxy/supplier/users";
const client = createBffCrudClient(BFF_BASE);

export { BffApiError as SupplierUserApiError };

export type SupplierInformationType = "contact" | "tax_invoice" | "delivery";

export type SupplierInformationInput = {
  setting_prefix_id?: number | null;
  /** Present on GET detail only; not sent on create/patch */
  setting_prefix_name?: string | null;
  name?: string | null;
  branch?: "headquarter" | "branch" | null;
  branch_name?: string | null;
  tax_number?: string | null;
  address?: string | null;
  website_province_id?: number | null;
  website_province_name?: string | null;
  website_district_id?: number | null;
  website_district_name?: string | null;
  website_sub_district_id?: number | null;
  website_sub_district_name?: string | null;
  postcode?: string | null;
  tel?: string | null;
  email?: string | null;
  is_same_information?: boolean;
};

export type SupplierListItem = {
  id: number;
  sku: string;
  credit_term?: number | null;
  credit_term_note?: string | null;
  is_active: boolean;
  updated_at: string;
  tax_number?: string;
  company_name?: string;
  setting_prefix_id?: number | null;
  company_address?: string;
  contact_tel?: string;
  contact_email?: string;
};

export type SupplierContactRow = {
  id: number;
  name: string;
  email?: string | null;
  tel?: string | null;
  position?: string | null;
  sort_order: number;
};

export type SupplierBankRow = {
  id: number;
  setting_bank_id: number;
  name: string;
  number: string;
  branch?: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};

export type SupplierDetail = {
  id: number;
  sku: string;
  credit_term?: number | null;
  credit_term_note?: string | null;
  is_active: boolean;
  updated_at: string;
  information: Partial<Record<SupplierInformationType, SupplierInformationInput>>;
  contacts: SupplierContactRow[];
  banks: SupplierBankRow[];
};

export type SupplierListParams = BffStandardListParams;

export type SupplierCreateBody = {
  sku: string;
  credit_term?: number | null;
  credit_term_note?: string | null;
  is_active?: boolean;
  information: Partial<Record<SupplierInformationType, SupplierInformationInput>>;
  contacts?: SupplierContactInput[];
  banks?: SupplierBankInput[];
};

export type SupplierPatchBody = {
  sku?: string;
  credit_term?: number | null;
  credit_term_note?: string | null;
  is_active?: boolean;
  information?: Partial<Record<SupplierInformationType, SupplierInformationInput>>;
};

export type SupplierContactInput = {
  name: string;
  email?: string | null;
  tel?: string | null;
  position?: string | null;
};

export type SupplierBankInput = {
  setting_bank_id: number;
  name: string;
  number: string;
  branch?: string | null;
  is_active?: boolean;
  is_default?: boolean;
};

export async function fetchSupplierUsers(
  locale: string,
  params: SupplierListParams
) {
  const { items, meta } = await client.list<SupplierListItem>(locale, params);
  return { rows: items, meta };
}

export async function fetchSupplierUser(
  locale: string,
  id: number
): Promise<SupplierDetail> {
  return client.getById<SupplierDetail>(locale, id);
}

export async function createSupplierUser(
  locale: string,
  body: SupplierCreateBody
): Promise<{ id: number }> {
  return client.create(locale, body);
}

export async function patchSupplierUser(
  locale: string,
  id: number,
  body: SupplierPatchBody
): Promise<void> {
  return client.patchVoid(locale, id, body);
}

export async function deleteSupplierUser(
  locale: string,
  id: number
): Promise<void> {
  return client.delete(locale, id);
}

async function nestedMutate(
  locale: string,
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<{ id?: number }> {
  const res = await authFetch(`${BFF_BASE}${path}`, {
    method,
    headers: {
      ...bffJsonHeaders(locale),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await parseBffError(res);
  if (method === "POST") {
    return (await res.json()) as { id: number };
  }
  return {};
}

export function createSupplierContact(
  locale: string,
  supplierId: number,
  body: SupplierContactInput
) {
  return nestedMutate(locale, `/${supplierId}/contacts`, "POST", body);
}

export function patchSupplierContact(
  locale: string,
  supplierId: number,
  contactId: number,
  body: SupplierContactInput
) {
  return nestedMutate(
    locale,
    `/${supplierId}/contacts/${contactId}`,
    "PATCH",
    body
  );
}

export function deleteSupplierContact(
  locale: string,
  supplierId: number,
  contactId: number
) {
  return nestedMutate(
    locale,
    `/${supplierId}/contacts/${contactId}`,
    "DELETE"
  );
}

export function reorderSupplierContacts(
  locale: string,
  supplierId: number,
  dragId: number,
  targetId: number
) {
  return nestedMutate(locale, `/${supplierId}/contacts/reorder`, "PATCH", {
    drag_id: dragId,
    target_id: targetId,
  });
}

export function reorderSupplierBanks(
  locale: string,
  supplierId: number,
  dragId: number,
  targetId: number
) {
  return nestedMutate(locale, `/${supplierId}/banks/reorder`, "PATCH", {
    drag_id: dragId,
    target_id: targetId,
  });
}

export function createSupplierBank(
  locale: string,
  supplierId: number,
  body: SupplierBankInput
) {
  return nestedMutate(locale, `/${supplierId}/banks`, "POST", body);
}

export function patchSupplierBank(
  locale: string,
  supplierId: number,
  bankId: number,
  body: SupplierBankInput
) {
  return nestedMutate(
    locale,
    `/${supplierId}/banks/${bankId}`,
    "PATCH",
    body
  );
}

export function deleteSupplierBank(
  locale: string,
  supplierId: number,
  bankId: number
) {
  return nestedMutate(locale, `/${supplierId}/banks/${bankId}`, "DELETE");
}
