export type PaymentMethod = 'cash' | 'upi' | 'khata';

const NAMES: Record<PaymentMethod, string> = { cash: 'Cash', upi: 'UPI', khata: 'Khata' };

export function paymentName(method: PaymentMethod): string {
  return NAMES[method];
}

/** "Cash", "Cash + UPI": how a bill was paid. */
export function paymentLabel(payments: { method: PaymentMethod }[]): string {
  return payments.map((payment) => NAMES[payment.method]).join(' + ');
}
