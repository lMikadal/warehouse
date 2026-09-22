import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const CLAIM_BASE = "/v1/order/store-claims";
const LIST_BASE = "/v1/order/store-claim-lists";

export const handleStoreClaimPaymentsGet = createSystemCrudHandlers(CLAIM_BASE).listGet;

export const handleStoreClaimItemsGet = (r: Request) =>
  proxyListGet(r, `${CLAIM_BASE}/items`);
export const handleStoreClaimMemberGet = (r: Request, id: string) =>
  proxyListGet(r, `${CLAIM_BASE}/members/${id}`);
export const handleStoreClaimPaymentGet = (r: Request, id: string) =>
  proxyListGet(r, `${CLAIM_BASE}/${id}`);
export const handleStoreClaimClaimsGet = (r: Request, id: string) =>
  proxyListGet(r, `${CLAIM_BASE}/${id}/claims`);

export const handleStoreClaimCreate = async (r: Request, id: string) => {
  const parsed = await readJsonBody(r);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(r, `${CLAIM_BASE}/${id}/claims`, {
    method: "POST",
    body: parsed.body,
  });
};

const listCrud = createSystemCrudHandlers(LIST_BASE);

export const handleStoreClaimListGet = listCrud.listGet;
export const handleStoreClaimListCountGet = (r: Request) =>
  proxyListGet(r, `${LIST_BASE}/count`);
export const handleStoreClaimDocumentGet = (r: Request, id: string) =>
  proxyListGet(r, `${LIST_BASE}/${id}`);
export const handleStoreClaimDelete = (r: Request, id: string) =>
  proxyAuthedBackendJson(r, `${LIST_BASE}/${id}`, { method: "DELETE" });
