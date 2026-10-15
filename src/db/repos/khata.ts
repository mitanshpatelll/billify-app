import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import type { KhataKind, SettlementMethod } from '@/lib/domain';
import { MAX_PAISE } from '@/lib/domain';
import { newId } from '@/lib/ids';

import { bills, customers, khataEntries, type CustomerRow, type KhataEntryRow } from '../schema';
import type { Db } from '../types';
import { RepoError } from './errors';
import { containsPattern } from './like';
import { enqueue, insertData } from './outbox';

type NewEntry = {
  customerId: string;
  kind: KhataKind;
  deltaPaise: number;
  refId?: string | null;
  method?: SettlementMethod | null;
};

/** One khata ledger row + its outbox entry. Call inside the caller's transaction. */
export function insertKhataEntry(tx: Db, input: NewEntry, now: Date): KhataEntryRow {
  const at = now.toISOString();
  const row: KhataEntryRow = {
    id: newId(now.getTime()),
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    customerId: input.customerId,
    kind: input.kind,
    deltaPaise: input.deltaPaise,
    refId: input.refId ?? null,
    method: input.method ?? null,
  };
  tx.insert(khataEntries).values(row).run();
  enqueue(tx, 'khata_entries', 'insert', insertData(row), at);
  return row;
}

// ------------------------------------------------------------------ balances

export type CustomerBalance = CustomerRow & {
  /** SUM(delta_paise): above 0 = due, below 0 = paid in advance. */
  balancePaise: number;
  /** 0 = never had anything on khata (shown as such, not as "settled"). */
  entries: number;
  lastBillAt: string | null;
  lastPaidAt: string | null;
};

export type KhataFilter = 'all' | 'due' | 'settled';

const balance = sql<number>`coalesce(sum(${khataEntries.deltaPaise}), 0)`;
const lastPaidAt = sql<
  string | null
>`max(case when ${khataEntries.kind} = 'settlement' then ${khataEntries.createdAt} end)`;
const lastBillAt = sql<
  string | null
>`(select max(${bills.createdAt}) from ${bills} where ${bills.customerId} = ${customers.id})`;

/** 04 Khata: customers with their balance, most due first. */
export function customerBalances(
  db: Db,
  { query = '', filter = 'all' as KhataFilter } = {},
): CustomerBalance[] {
  const q = query.trim();
  const digits = q.replace(/\D/g, '');
  const rows = db
    .select({
      ...customersColumns(),
      balancePaise: balance,
      entries: sql<number>`count(${khataEntries.id})`,
      lastPaidAt,
      lastBillAt,
    })
    .from(customers)
    .leftJoin(khataEntries, eq(khataEntries.customerId, customers.id))
    .where(
      and(
        isNull(customers.deletedAt),
        q
          ? sql`(${customers.name} like ${containsPattern(q)} escape '\\'${
              digits
                ? sql` or ${customers.phone} like ${containsPattern(digits)} escape '\\'`
                : sql``
            })`
          : undefined,
      ),
    )
    .groupBy(customers.id)
    .orderBy(desc(balance), sql`${customers.name} collate nocase`)
    .all();
  if (filter === 'due') return rows.filter((row) => row.balancePaise > 0);
  if (filter === 'settled') {
    return rows.filter((row) => row.balancePaise <= 0 && row.entries > 0);
  }
  return rows;
}

function customersColumns() {
  return {
    id: customers.id,
    createdAt: customers.createdAt,
    updatedAt: customers.updatedAt,
    deletedAt: customers.deletedAt,
    name: customers.name,
    phone: customers.phone,
    khataLimitPaise: customers.khataLimitPaise,
    linkedUserId: customers.linkedUserId,
  };
}

export type KhataSummary = {
  toCollectPaise: number;
  dueCustomers: number;
  customers: number;
  collectedSincePaise: number;
  givenSincePaise: number;
};

/** The tiles on 04 Khata: what's due in total, and what came in / went out since `since`. */
export function khataSummary(db: Db, since: Date): KhataSummary {
  const all = customerBalances(db);
  const at = since.toISOString();
  const week = db
    .select({
      collected: sql<number>`coalesce(sum(case when ${khataEntries.kind} = 'settlement' then -${khataEntries.deltaPaise} end), 0)`,
      given: sql<number>`coalesce(sum(case when ${khataEntries.kind} = 'credit_sale' then ${khataEntries.deltaPaise} end), 0)`,
    })
    .from(khataEntries)
    .where(gte(khataEntries.createdAt, at))
    .get();
  const due = all.filter((row) => row.balancePaise > 0);
  return {
    toCollectPaise: due.reduce((sum, row) => sum + row.balancePaise, 0),
    dueCustomers: due.length,
    customers: all.length,
    collectedSincePaise: week?.collected ?? 0,
    givenSincePaise: week?.given ?? 0,
  };
}

export type KhataLine = KhataEntryRow & { billNumber: string | null; billItems: number | null };

/** 15 Customer khata: balance and every entry, newest first, with its bill number. */
export function customerKhata(
  db: Db,
  customerId: string,
): { balancePaise: number; entries: KhataLine[] } {
  const entries = db
    .select({
      id: khataEntries.id,
      createdAt: khataEntries.createdAt,
      updatedAt: khataEntries.updatedAt,
      deletedAt: khataEntries.deletedAt,
      customerId: khataEntries.customerId,
      kind: khataEntries.kind,
      deltaPaise: khataEntries.deltaPaise,
      refId: khataEntries.refId,
      method: khataEntries.method,
      billNumber: bills.number,
      billItems: sql<
        number | null
      >`(select count(*) from bill_items where bill_items.bill_id = ${bills.id})`,
    })
    .from(khataEntries)
    .leftJoin(bills, eq(bills.id, khataEntries.refId))
    .where(eq(khataEntries.customerId, customerId))
    .orderBy(desc(khataEntries.createdAt))
    .all();
  return { balancePaise: entries.reduce((sum, entry) => sum + entry.deltaPaise, 0), entries };
}

/**
 * The customer paid back (User Flows §4): a settlement entry for minus the amount. Paying more
 * than is due is allowed; the balance then shows as an advance.
 */
export function recordPayment(
  db: Db,
  customerId: string,
  amountPaise: number,
  method: SettlementMethod,
  now = new Date(),
): KhataEntryRow {
  if (!Number.isInteger(amountPaise) || amountPaise < 1 || amountPaise > MAX_PAISE) {
    throw new RepoError('INVALID_AMOUNT', 'Enter the amount received');
  }
  return db.transaction((tx) => {
    const customer = tx.select().from(customers).where(eq(customers.id, customerId)).get();
    if (!customer || customer.deletedAt) {
      throw new RepoError('CUSTOMER_NOT_FOUND', 'This customer is gone');
    }
    return insertKhataEntry(
      tx,
      { customerId, kind: 'settlement', deltaPaise: -amountPaise, method },
      now,
    );
  });
}
