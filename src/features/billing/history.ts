import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { billsRepo, summaryRepo } from '@/db/repos';
import type { BillListRow } from '@/db/repos/bills';
import type { DaySummary } from '@/db/repos/summary';
import { startOfWeek } from '@/lib/dates';
import { useDayStart } from '@/lib/use-day';

export type { BillListRow, DaySummary };

export type BillRangeName = 'today' | 'yesterday' | 'week' | 'all';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The time window of a range ([from, to)), from today's midnight on the phone's clock. */
export function rangeBounds(range: BillRangeName, dayStart: number): { from?: Date; to?: Date } {
  if (range === 'today') return { from: new Date(dayStart), to: new Date(dayStart + DAY_MS) };
  if (range === 'yesterday') return { from: new Date(dayStart - DAY_MS), to: new Date(dayStart) };
  if (range === 'week') return { from: startOfWeek(new Date(dayStart)) };
  return {};
}

const BILL_TABLES = ['bills', 'payments', 'customers', 'bill_items'] as const;

/** 17 Bills: the rows (newest 200) and the totals over every matching bill. */
export function useBillList(
  range: BillRangeName,
  query: string,
): { rows: BillListRow[]; bills: number; totalPaise: number } {
  const dayStart = useDayStart();
  return useDbQuery(BILL_TABLES, () => {
    const bounds = { ...rangeBounds(range, dayStart), query };
    return { rows: billsRepo.listBills(db, bounds), ...billsRepo.billTotals(db, bounds) };
  }, [range, dayStart, query]);
}

/** 05 Today: today's numbers, recomputed on every bill, payment, stock or khata change. */
export function useTodaySummary(): DaySummary & { dayStart: number } {
  const dayStart = useDayStart();
  return useDbQuery(
    ['bills', 'payments', 'bill_items', 'khata_entries', 'stock_movements', 'products'],
    () => ({
      ...summaryRepo.daySummary(db, new Date(dayStart), new Date(dayStart + DAY_MS)),
      dayStart,
    }),
    [dayStart],
  );
}

/** Throws RepoError (BILL_ALREADY_VOIDED, BILL_NOT_FOUND). */
export function voidBill(id: string): void {
  billsRepo.voidBill(db, id);
}
