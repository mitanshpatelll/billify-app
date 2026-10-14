// Money is always integer paise (₹202.00 → 20200), never floats. See Billify - Screen Flow, format rules.

// Indian grouping: last three digits, then pairs: 1,23,456.
function groupIndian(rupees: number): string {
  const digits = String(rupees);
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${head},${digits.slice(-3)}`;
}

/** 123456700 → "₹12,34,567.00"; with `showPaise: false` → "₹12,34,567" (rounded). */
export function formatRupees(paise: number, { showPaise = true } = {}): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(Math.round(paise));
  if (!showPaise) return `${sign}₹${groupIndian(Math.round(abs / 100))}`;
  const rupees = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}₹${groupIndian(rupees)}.${rest}`;
}

/** Paise as a plain decimal for UPI links: 20200 → "202.00". */
export function toDecimalRupees(paise: number): string {
  return (Math.round(paise) / 100).toFixed(2);
}

/** Parses what a shopkeeper types ("25", "25.5", "₹1,240.00") into paise; null if it isn't a price. */
export function parseRupees(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
