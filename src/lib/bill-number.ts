/** Bill prefix: 1 to 3 capital letters, chosen at shop setup. */
export const BILL_PREFIX_PATTERN = /^[A-Z]{1,3}$/;

/** "A-001", "A-002" … "A-1000": prefix + counter, made on the phone. */
export function formatBillNumber(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(3, '0')}`;
}
