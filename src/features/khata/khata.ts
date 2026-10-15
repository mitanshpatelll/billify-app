import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { customersRepo, khataRepo } from '@/db/repos';
import type { CustomerBalance, KhataFilter, KhataLine, KhataSummary } from '@/db/repos/khata';
import { startOfWeek } from '@/lib/dates';
import type { SettlementMethod } from '@/lib/domain';

export type { CustomerBalance, KhataFilter, KhataLine };

const KHATA_TABLES = ['customers', 'khata_entries', 'bills'] as const;

export function useCustomerBalances(query: string, filter: KhataFilter): CustomerBalance[] {
  return useDbQuery(KHATA_TABLES, () => khataRepo.customerBalances(db, { query, filter }), [
    query,
    filter,
  ]);
}

/**
 * This week = since Monday 00:00 on the phone's clock. Worked out on every render (the tab
 * re-renders when it comes back into focus), so a new week starts without a write.
 */
export function useKhataSummary(): KhataSummary {
  const weekStart = startOfWeek().toISOString();
  return useDbQuery(KHATA_TABLES, () => khataRepo.khataSummary(db, new Date(weekStart)), [
    weekStart,
  ]);
}

export function useCustomerKhata(customerId: string | undefined): {
  balancePaise: number;
  entries: KhataLine[];
} {
  return useDbQuery(
    ['khata_entries', 'bills'],
    () => (customerId ? khataRepo.customerKhata(db, customerId) : { balancePaise: 0, entries: [] }),
    [customerId],
  );
}

/** Throws RepoError. */
export function recordPayment(
  customerId: string,
  amountPaise: number,
  method: SettlementMethod,
): void {
  khataRepo.recordPayment(db, customerId, amountPaise, method);
}

/** Throws RepoError. */
export function updateCustomer(
  id: string,
  input: { name?: string; phone?: string | null; khataLimitPaise?: number | null },
): void {
  customersRepo.updateCustomer(db, id, input);
}
