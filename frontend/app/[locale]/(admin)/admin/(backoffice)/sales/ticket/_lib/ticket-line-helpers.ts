/** Line math shared by the ticket create/edit form (v1 qty-helpers + deposit-helpers). */

export const DEFAULT_QTY_SELL = 1;

/** Clamp sell qty to a non-negative integer. */
export function clampQtySell(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
}

/** Preliminary reorder qty = qty_sell − stock on hand (never below 0). */
export function preliminaryQtyReorder(qtySell: number, stockQty?: number): number {
  const sell = clampQtySell(qtySell);
  const stock =
    stockQty != null && Number.isFinite(stockQty)
      ? Math.max(0, Math.floor(stockQty))
      : 0;
  return Math.max(0, sell - stock);
}

export function sumLineDeposits(lines: { deposit: string }[]): number {
  return lines.reduce((sum, line) => sum + (parseFloat(line.deposit) || 0), 0);
}

/** Deposit slip number reuses the request number with the TK prefix swapped for BP. */
export function toDepositReceiptNo(requestNo: string): string {
  if (!requestNo) return "";
  return requestNo.replace(/^TK-/i, "BP-");
}
