// Value lists shared with billify-api (src/lib/domain.ts there). Keep the two in step:
// the server rejects a mutation whose value isn't in its list.

export const SYNCED_TABLES = [
  'products',
  'customers',
  'bills',
  'bill_items',
  'payments',
  'stock_movements',
  'khata_entries',
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

export const STOCK_REASONS = ['sale', 'purchase', 'adjustment', 'return', 'void'] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

// credit_sale adds to what the customer owes, settlement takes it off, adjustment is either.
export const KHATA_KINDS = ['credit_sale', 'settlement', 'adjustment'] as const;
export type KhataKind = (typeof KHATA_KINDS)[number];

// ₹1 crore: far above any kirana bill (the server's limit too).
export const MAX_PAISE = 1_000_000_000;

// Quantities carry 3 decimals (0.25 kg, 0.125 litre).
export const MAX_QTY = 100_000;

/** Rounds a quantity to the 3 decimals the server keeps. */
export function roundQty(qty: number): number {
  return Math.round(qty * 1000) / 1000;
}
