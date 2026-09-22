import type {
  StoreClaimPaymentLine,
  StoreClaimPaymentType,
  StoreClaimType,
} from "@/lib/order-store-claim-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";

export type StoreClaimDraftItem = {
  paymentItemId: number;
  type: StoreClaimType;
  reasonId: number;
  reasonName: string;
  amount: number;
  note: string;
  product?: ProductItemBrowseRow;
  detail: string;
  /** Share of the paid line total this claimed quantity is worth. */
  lineTotalPrice: number;
};

export type StoreClaimDraft = {
  type: StoreClaimType | null;
  items: StoreClaimDraftItem[];
  paymentType: StoreClaimPaymentType | "";
  otherReason: string;
  /** Free-typed refund amount, kept as text so the clerk can clear it. */
  totalPrice: string;
};

export const BLANK_STORE_CLAIM_DRAFT: StoreClaimDraft = {
  type: null,
  items: [],
  paymentType: "",
  otherReason: "",
  totalPrice: "",
};

/** A claim covers a single line, a return may cover many, and the topics may not be mixed. */
export function canAddStoreClaimItem(
  draft: Pick<StoreClaimDraft, "type" | "items">,
  topic: StoreClaimType,
  paymentItemId: number
): boolean {
  if (draft.items.some((it) => it.paymentItemId === paymentItemId)) return false;
  if (draft.type == null) return true;
  if (draft.type !== topic) return false;
  if (draft.type === "claim" && draft.items.length >= 1) return false;
  return true;
}

export function clampStoreClaimQty(raw: string, max: number): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(Math.trunc(n), Math.max(1, Math.trunc(max)));
}

/** Scale the paid line total to the claimed quantity. */
export function proportionalLineTotal(
  lineTotalPrice: number,
  maxAmount: number,
  claimAmount: number
): number {
  if (claimAmount <= 0) return 0;
  if (maxAmount <= 0) return lineTotalPrice;
  return Math.round(lineTotalPrice * (claimAmount / maxAmount) * 100) / 100;
}

/** What is still claimable on a paid line, after the claims already on file. */
export function remainingClaimAmount(line: StoreClaimPaymentLine): number {
  return Math.max(0, line.amount - line.claimed_amount);
}

export function storeClaimDraftTotal(items: StoreClaimDraftItem[]): number {
  return Math.round(items.reduce((s, it) => s + it.lineTotalPrice, 0) * 100) / 100;
}

export function addStoreClaimItem(
  draft: StoreClaimDraft,
  item: StoreClaimDraftItem
): StoreClaimDraft {
  const items = [...draft.items, item];
  return {
    ...draft,
    type: draft.type ?? item.type,
    items,
    totalPrice: String(storeClaimDraftTotal(items)),
  };
}

/** Dropping the last line puts the document back to blank, as v1 did. */
export function removeStoreClaimItem(
  draft: StoreClaimDraft,
  paymentItemId: number
): StoreClaimDraft {
  const items = draft.items.filter((it) => it.paymentItemId !== paymentItemId);
  if (items.length === 0) return BLANK_STORE_CLAIM_DRAFT;
  return { ...draft, items, totalPrice: String(storeClaimDraftTotal(items)) };
}

export function canSubmitStoreClaim(draft: StoreClaimDraft): boolean {
  return (
    draft.type != null &&
    draft.items.length > 0 &&
    (draft.type !== "claim" || draft.items.length === 1) &&
    draft.paymentType !== "" &&
    (draft.paymentType !== "other" || draft.otherReason.trim() !== "") &&
    draft.totalPrice.trim() !== "" &&
    Number(draft.totalPrice) >= 0
  );
}
