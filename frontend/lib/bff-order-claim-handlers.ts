import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/order/claims";
const crud = createSystemCrudHandlers(BASE);

export const handleClaimListGet = crud.listGet;
export const handleClaimGet = crud.getById;

export const handleClaimCountGet = (r: Request) =>
  proxyListGet(r, `${BASE}/count`);
export const handleClaimHistoryGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}/history`);

export async function handleClaimPut(request: Request, id: string) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/${id}`, {
    method: "PUT",
    body: parsed.body,
  });
}
