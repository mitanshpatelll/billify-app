import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';

import type { PaymentMethod } from '@/lib/payments';
import type { Unit } from '@/lib/units';

import { billItems, bills, khataEntries, payments } from '../schema';
import type { Db } from '../types';
import { lowStock, type StockLevel } from './stock';

export type MethodTotal = { method: PaymentMethod; paise: number; bills: number };

export type DaySummary = {
  salesPaise: number;
  bills: number;
  cancelled: number;
  methods: MethodTotal[];
  /** Khata paid back in cash / UPI during the day (not sales, but money in hand). */
  khataCollected: { cash: number; upi: number };
  /** What should be in the drawer from today: cash bills + khata paid back in cash. */
  expectedCashPaise: number;
  topItems: { name: string; unit: Unit; qty: number; paise: number }[];
  /** Low-stock items that sold today: the ones that "went low today". */
  wentLow: StockLevel[];
};

/**
 * 05 Today (User Flows §5), from SQLite, so it works offline and is instant. Cancelled bills
 * don't count. `from` / `to` are the day's bounds on the phone's clock.
 */
export function daySummary(db: Db, from: Date, to: Date): DaySummary {
  const inDay = and(
    gte(bills.createdAt, from.toISOString()),
    lt(bills.createdAt, to.toISOString()),
    isNull(bills.voidedAt),
  );

  const totals = db
    .select({ paise: sql<number>`coalesce(sum(${bills.totalPaise}), 0)`, n: sql<number>`count(*)` })
    .from(bills)
    .where(inDay)
    .get();

  const cancelled =
    db
      .select({ n: sql<number>`count(*)` })
      .from(bills)
      .where(
        and(
          gte(bills.createdAt, from.toISOString()),
          lt(bills.createdAt, to.toISOString()),
          sql`${bills.voidedAt} is not null`,
        ),
      )
      .get()?.n ?? 0;

  const byMethod = db
    .select({
      method: payments.method,
      paise: sql<number>`sum(${payments.amountPaise})`,
      bills: sql<number>`count(distinct ${payments.billId})`,
    })
    .from(payments)
    .innerJoin(bills, eq(bills.id, payments.billId))
    .where(inDay)
    .groupBy(payments.method)
    .all();
  const methods: MethodTotal[] = (['cash', 'upi', 'khata'] as const).map((method) => {
    const row = byMethod.find((m) => m.method === method);
    return { method, paise: row?.paise ?? 0, bills: row?.bills ?? 0 };
  });

  const collected = db
    .select({
      method: khataEntries.method,
      paise: sql<number>`coalesce(sum(-${khataEntries.deltaPaise}), 0)`,
    })
    .from(khataEntries)
    .where(
      and(
        eq(khataEntries.kind, 'settlement'),
        gte(khataEntries.createdAt, from.toISOString()),
        lt(khataEntries.createdAt, to.toISOString()),
      ),
    )
    .groupBy(khataEntries.method)
    .all();
  const khataCollected = {
    // A settlement from before methods were recorded is counted as cash: the safer guess for
    // a drawer count is to expect the money.
    cash: collected.filter((row) => row.method !== 'upi').reduce((sum, row) => sum + row.paise, 0),
    upi: collected.find((row) => row.method === 'upi')?.paise ?? 0,
  };

  const topItems = db
    .select({
      name: billItems.nameSnapshot,
      unit: billItems.unit,
      qty: sql<number>`round(sum(${billItems.qty}), 3)`,
      paise: sql<number>`sum(round(${billItems.qty} * ${billItems.unitPricePaise}))`,
    })
    .from(billItems)
    .innerJoin(bills, eq(bills.id, billItems.billId))
    .where(inDay)
    .groupBy(sql`coalesce(${billItems.productId}, ${billItems.nameSnapshot})`, billItems.unit)
    .orderBy(desc(sql`sum(round(${billItems.qty} * ${billItems.unitPricePaise}))`))
    .limit(5)
    .all();

  const soldToday = new Set(
    db
      .selectDistinct({ productId: billItems.productId })
      .from(billItems)
      .innerJoin(bills, eq(bills.id, billItems.billId))
      .where(inDay)
      .all()
      .map((row) => row.productId),
  );

  const cashSales = methods.find((m) => m.method === 'cash')?.paise ?? 0;
  return {
    salesPaise: totals?.paise ?? 0,
    bills: totals?.n ?? 0,
    cancelled,
    methods,
    khataCollected,
    expectedCashPaise: cashSales + khataCollected.cash,
    topItems,
    wentLow: lowStock(db).filter((item) => soldToday.has(item.id)),
  };
}
