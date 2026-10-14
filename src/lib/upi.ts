import { toDecimalRupees } from './money';

/** name@handle, e.g. sharmakirana@okaxis */
export const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

type UpiPayment = {
  upiId: string;
  payeeName: string;
  amountPaise: number;
  /** Shown in the customer's UPI app, e.g. the bill number. */
  note: string;
};

/** upi://pay link with the amount filled in. No gateway: the shop sees the credit on its own phone. */
export function upiPayLink({ upiId, payeeName, amountPaise, note }: UpiPayment): string {
  const params = [
    `pa=${upiId}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${toDecimalRupees(amountPaise)}`,
    'cu=INR',
    `tn=${encodeURIComponent(note)}`,
  ];
  return `upi://pay?${params.join('&')}`;
}
