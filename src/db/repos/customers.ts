import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { MAX_PAISE } from '@/lib/domain';
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
      khataLimitPaise: null,
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

/**
 * Edits name / phone / khata limit (null = no limit). Only fields that change are written and
 * pushed (last write wins).
 */
export function updateCustomer(
  db: Db,
  id: string,
  input: { name?: string; phone?: string | null; khataLimitPaise?: number | null },
  now = new Date(),
): CustomerRow {
  return db.transaction((tx) => {
    const current = getCustomer(tx, id);
    if (!current || current.deletedAt) {
      throw new RepoError('CUSTOMER_NOT_FOUND', 'This customer is gone');
    }
    const changed: Partial<Pick<CustomerRow, 'name' | 'phone' | 'khataLimitPaise'>> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 1 || name.length > 80) {
        throw new RepoError('INVALID_NAME', 'Customer name must be 1 to 80 characters');
      }
      if (name !== current.name) changed.name = name;
    }
    if (input.phone !== undefined) {
      let phone: string | null = null;
      if (input.phone !== null && input.phone.trim()) {
        phone = normalizePhone(input.phone);
        if (!phone) throw new RepoError('INVALID_PHONE', 'Enter a 10-digit mobile number');
      }
      if (phone !== current.phone) changed.phone = phone;
    }
    if (input.khataLimitPaise !== undefined) {
      const limit = input.khataLimitPaise;
      if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAISE)) {
        throw new RepoError('INVALID_LIMIT', 'Enter a khata limit in rupees, or leave it empty');
      }
      if (limit !== current.khataLimitPaise) changed.khataLimitPaise = limit;
    }
    if (Object.keys(changed).length === 0) return current;
    const at = now.toISOString();
    tx.update(customers)
      .set({ ...changed, updatedAt: at })
      .where(eq(customers.id, id))
      .run();
    enqueue(tx, 'customers', 'update', { id, ...changed }, at);
    return { ...current, ...changed, updatedAt: at };
  });
}
