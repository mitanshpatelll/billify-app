export const UNITS = ['pcs', 'kg', 'g', 'litre'] as const;
export type Unit = (typeof UNITS)[number];

// Loose items are sold by weight or volume; packaged items by piece.
export function isLoose(unit: Unit): boolean {
  return unit !== 'pcs';
}

/** "2 kg", "1.5 kg", "3" (pieces show no unit). */
export function formatQty(qty: number, unit: Unit): string {
  const value = Number.isInteger(qty) ? String(qty) : String(Number(qty.toFixed(3)));
  return unit === 'pcs' ? value : `${value} ${unit}`;
}

/** Unit price label: "each" for pieces, "/ kg" for loose. */
export function perUnit(unit: Unit): string {
  return unit === 'pcs' ? 'each' : `/ ${unit}`;
}

/** Quantity of the first tap on a quick key or search result: 1 kg, 1 litre, 1 piece, 100 g. */
export function firstQty(unit: Unit): number {
  return unit === 'g' ? 100 : 1;
}

/** How much one stepper tap changes the quantity. */
export function qtyStep(unit: Unit): number {
  if (unit === 'kg' || unit === 'litre') return 0.5;
  if (unit === 'g') return 100;
  return 1;
}
