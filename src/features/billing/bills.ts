import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { billsRepo } from '@/db/repos';
import type { NewBill, NewPayment, SavedBill } from '@/db/repos/bills';

export type { NewPayment, SavedBill };
export { paymentLabel } from '@/lib/payments';

/** The number the next bill will get, e.g. "A-104". */
export function useNextBillNumber(prefix: string): string {
  return useDbQuery(['bills'], () => billsRepo.nextBillNumber(db, prefix), [prefix]);
}

/** A saved bill with lines and payments; null if it isn't on this phone. */
export function useBill(id: string | undefined): SavedBill | null {
  return useDbQuery(
    ['bills', 'bill_items', 'payments'],
    () => (id ? (billsRepo.getBill(db, id) ?? null) : null),
    [id],
  );
}

/** One transaction: bill, lines, payments, stock, khata + outbox. Throws RepoError. */
export function saveBill(input: NewBill) {
  return billsRepo.saveBill(db, input);
}
