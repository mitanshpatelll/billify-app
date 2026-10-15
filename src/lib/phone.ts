/**
 * What a shopkeeper types for a customer's mobile ("98765 04521", "+91 98765-04521",
 * "098765 04521") as 10 digits with no +91; null if it isn't an Indian mobile number.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** "+91 98765 04521" */
export function formatPhone(phone: string): string {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

/** "•••• 4521": shown before sending a bill on WhatsApp, so a typo doesn't reach a stranger. */
export function maskPhone(phone: string): string {
  return `•••• ${phone.slice(-4)}`;
}
