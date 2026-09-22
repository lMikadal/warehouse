/**
 * Hand-offs between the picking form and the payment screen, ported from v1's
 * `credit-approval-storage.ts` and `extra-pay-session-storage.ts`. Both live in sessionStorage because
 * they belong to one clerk at one till: an approver PIN already checked, and the subset of goods an
 * extra-pay round is settling.
 */

export type ExtraPayLine = {
  order_list_item_id: number;
  amount: number;
  price_per_unit: number;
  discount: number;
};

const creditKey = (orderId: number) => `sales-order:credit-approved-by:${orderId}`;
const extraPayKey = (orderId: number) => `sales-order:extra-pay:${orderId}`;

function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // A private-mode window with storage disabled just loses the hand-off; the clerk re-approves.
  }
}

function clearSession(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function setCreditApprovedBy(orderId: number, userId: number): void {
  if (orderId < 1 || userId < 1) return;
  writeSession(creditKey(orderId), String(userId));
}

export function getCreditApprovedBy(orderId: number): number | null {
  if (orderId < 1) return null;
  const raw = readSession(creditKey(orderId));
  const id = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function clearCreditApprovedBy(orderId: number): void {
  clearSession(creditKey(orderId));
}

export function setExtraPayLines(orderId: number, lines: ExtraPayLine[]): void {
  if (orderId < 1 || lines.length === 0) return;
  writeSession(extraPayKey(orderId), JSON.stringify({ lines }));
}

export function getExtraPayLines(orderId: number): ExtraPayLine[] | null {
  if (orderId < 1) return null;
  const raw = readSession(extraPayKey(orderId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { lines?: ExtraPayLine[] };
    return parsed.lines?.length ? parsed.lines : null;
  } catch {
    return null;
  }
}

export function clearExtraPayLines(orderId: number): void {
  clearSession(extraPayKey(orderId));
}
