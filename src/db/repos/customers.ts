import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { newId } from '@/lib/ids';
import { normalizePhone } from '@/lib/phone';

import { customers, type CustomerRow } from '../schema';
import type { Db } from '../types';
import { RepoError } from './errors';
import { containsPattern } from './like';
import { enqueue, insertData } from './outbox';

export type NewCustomer = { name: string; phone: string | null };

const live = isNull(customers.deletedAt);

/** A new customer (name, optional mobile number) + its outbox entry. */
export function createCustomer(db: Db, input: NewCustomer, now = new Date()): CustomerRow {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) {
    throw new RepoError('INVALID_NAME', 'Customer name must be 1 to 80 characters');
  }
  let phone: string | null = null;
  if (input.phone !== null && input.phone.trim()) {
    phone = normalizePhone(input.phone);
    if (!phone) throw new RepoError('INVALID_PHONE', 'Enter a 10-digit mobile number');
  }
  return db.transaction((tx) => {
    const at = now.toISOString();
    const row: CustomerRow = {
      id: newId(now.getTime()),
      createdAt: at,
      updatedAt: at,
      deletedAt: null,
      name,
      phone,
      linkedUserId: null,
    };
    tx.insert(customers).values(row).run();
    enqueue(tx, 'customers', 'insert', insertData(row), at);
    return row;
  });
}

export function getCustomer(db: Db, id: string): CustomerRow | undefined {
  return db.select().from(customers).where(eq(customers.id, id)).get();
}

/** Name or phone digits containing the query; everyone when it's empty. Sorted by name. */
export function searchCustomers(db: Db, query: string, limit = 50): CustomerRow[] {
  const q = query.trim();
  const digits = q.replace(/\D/g, '');
  const match = q
    ? or(
        sql`${customers.name} like ${containsPattern(q)} escape '\\'`,
        digits ? sql`${customers.phone} like ${containsPattern(digits)} escape '\\'` : undefined,
      )
    : undefined;
  return db
    .select()
    .from(customers)
    .where(and(live, match))
    .orderBy(sql`${customers.name} collate nocase`)
    .limit(limit)
    .all();
}
