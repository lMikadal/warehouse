import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/order/sales-claims";

const crud = createSystemCrudHandlers(BASE);

export const handleSalesClaimListGet = crud.listGet;
export const handleSalesClaimCountGet = (r: Request) =>
  proxyListGet(r, `${BASE}/count`);
export const handleSalesClaimItemsGet = (r: Request) =>
  proxyListGet(r, `${BASE}/items`);
export const handleSalesClaimFiltersGet = (r: Request) =>
  proxyListGet(r, `${BASE}/filters`);
export const handleSalesClaimGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}`);
export const handleSalesClaimDelete = (r: Request, id: string) =>
  proxyAuthedBackendJson(r, `${BASE}/${id}`, { method: "DELETE" });

export const handleSalesClaimPatch = async (r: Request, id: string) => {
  const parsed = await readJsonBody(r);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(r, `${BASE}/${id}`, {
    method: "PATCH",
    body: parsed.body,
  });
};

export const handleSalesClaimStatusPatch = async (r: Request, id: string) => {
  const parsed = await readJsonBody(r);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(r, `${BASE}/${id}/status`, {
    method: "PATCH",
    body: parsed.body,
  });
};

export const handleSalesClaimItemPatch = async (
  r: Request,
  id: string,
  itemId: string,
) => {
  const parsed = await readJsonBody(r);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(r, `${BASE}/${id}/items/${itemId}`, {
    method: "PATCH",
    body: parsed.body,
  });
};
