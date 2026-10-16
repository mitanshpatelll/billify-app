import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNull,
  like,
  lt,
  or,
  sql,
} from 'drizzle-orm';

import { formatBillNumber } from '@/lib/bill-number';
import { MAX_PAISE, MAX_QTY, roundQty } from '@/lib/domain';
import { newId, newPublicToken } from '@/lib/ids';
import { lineTotalPaise } from '@/lib/money';
import type { PaymentMethod } from '@/lib/payments';
import type { Unit } from '@/lib/units';

import {
  billItems,
  bills,
  customers,
  khataEntries,
  payments,
  products,
  stockMovements,
  type BillItemRow,
  type BillRow,
  type PaymentRow,
} from '../schema';
import type { Db } from '../types';
import { getCustomer } from './customers';
import { RepoError } from './errors';
import { insertKhataEntry } from './khata';
import { containsPattern } from './like';
import { enqueue, insertData } from './outbox';
import { insertStockMovement } from './stock';

/** One line of the bill as sold: name and price copied from the product at sale time. */
export type BillLine = {
  productId: string | null;
  name: string;
  unit: Unit;
  qty: number;
  unitPricePaise: number;
};

export type NewPayment = { method: PaymentMethod; amountPaise: number };

export type NewBill = {
  /**
   * The cart's draft id, used as the bill id: saving the same draft twice (app killed after
   * the bill was saved but before the cart was cleared) returns the bill already saved.
   */
  id?: string;
  billPrefix: string;
  customerId: string | null;
  /** In bill order (first line first). */
  lines: BillLine[];
  /** Discount and round-off off the lines' sum (paise, 0 or more). */
  discountPaise?: number;
  payments: NewPayment[];
};

export type SavedBill = BillRow & { items: BillItemRow[]; payments: PaymentRow[] };

/** The number the next bill will get: highest counter for this prefix + 1. */
export function nextBillNumber(db: Db, prefix: string): string {
  const start = prefix.length + 2; // after "A-"
  const row = db
    .select({ max: sql<number | null>`max(cast(substr(${bills.number}, ${start}) as integer))` })
    .from(bills)
    .where(like(bills.number, `${prefix}-%`))
    .get();
  return formatBillNumber(prefix, (row?.max ?? 0) + 1);
}

function validate(input: NewBill): { total: number; discount: number } {
  if (input.lines.length === 0) throw new RepoError('EMPTY_BILL', 'Add an item first');
  for (const line of input.lines) {
    // Checked as stored: a qty that rounds to 0 would be refused by the server (qty > 0).
    const qty = roundQty(line.qty);
    if (!(qty > 0) || qty > MAX_QTY) {
      throw new RepoError('INVALID_QTY', `Check the quantity of ${line.name}`);
    }
  }
  const subtotal = input.lines.reduce(
    (sum, line) => sum + lineTotalPaise(roundQty(line.qty), line.unitPricePaise),
    0,
  );
  if (subtotal < 1 || subtotal > MAX_PAISE) {
    throw new RepoError('INVALID_TOTAL', 'Check the bill total');
  }
  const discount = input.discountPaise ?? 0;
  if (!Number.isInteger(discount) || discount < 0 || discount >= subtotal) {
    throw new RepoError('INVALID_DISCOUNT', 'The discount must be less than the bill');
  }
  const total = subtotal - discount;
  if (total < 1 || total > MAX_PAISE) throw new RepoError('INVALID_TOTAL', 'Check the bill total');
  const paid = input.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
  if (input.payments.some((payment) => payment.amountPaise < 1) || paid !== total) {
    throw new RepoError('PAYMENTS_MISMATCH', 'Payments must add up to the total');
  }
  if (input.payments.some((payment) => payment.method === 'khata') && !input.customerId) {
    throw new RepoError('KHATA_NEEDS_CUSTOMER', 'Pick a customer to add this bill to khata');
  }
  return { total, discount };
}

/**
 * Saves a bill in one SQLite transaction (User Flows §2, "Save"): the bill, its lines and
 * payments, a sale stock movement per tracked product, a khata entry for the khata part, and an
 * outbox entry for every row, parents first. It never waits for the network.
 */
export function saveBill(db: Db, input: NewBill, now = new Date()): BillRow {
  const { total, discount } = validate(input);
  return db.transaction((tx) => {
    if (input.id) {
      const saved = tx.select().from(bills).where(eq(bills.id, input.id)).get();
      if (saved) return saved;
    }
    if (input.customerId && !getCustomer(tx, input.customerId)) {
      throw new RepoError('CUSTOMER_NOT_FOUND', 'This customer isn’t on this phone');
    }
    const at = now.toISOString();
    const time = now.getTime();
    const base = { createdAt: at, updatedAt: at, deletedAt: null };

    const bill: BillRow = {
      ...base,
      id: input.id ?? newId(time),
      customerId: input.customerId,
      number: nextBillNumber(tx, input.billPrefix),
      totalPaise: total,
      discountPaise: discount,
      publicToken: newPublicToken(),
      voidedAt: null,
    };
    tx.insert(bills).values(bill).run();
    enqueue(tx, 'bills', 'insert', insertData(bill), at);

    input.lines.forEach((line, position) => {
      const item: BillItemRow = {
        ...base,
        id: newId(time),
        billId: bill.id,
        productId: line.productId,
        position,
        nameSnapshot: line.name,
        unit: line.unit,
        qty: roundQty(line.qty),
        unitPricePaise: line.unitPricePaise,
      };
      tx.insert(billItems).values(item).run();
      enqueue(tx, 'bill_items', 'insert', insertData(item), at);
    });

    for (const payment of input.payments) {
      const row: PaymentRow = { ...base, id: newId(time), billId: bill.id, ...payment };
      tx.insert(payments).values(row).run();
      enqueue(tx, 'payments', 'insert', insertData(row), at);
    }

    // Stock drops only for products that track it. A product can sell into negative stock:
    // it shows red under "fix a count", it never blocks the counter (User Flows §3).
    const productIds = input.lines.flatMap((line) => (line.productId ? [line.productId] : []));
    const trackedIds = new Set(
      productIds.length
        ? tx
            .select({ id: products.id })
            .from(products)
            .where(and(inArray(products.id, productIds), eq(products.trackStock, true)))
            .all()
            .map((row) => row.id)
        : [],
    );
    for (const line of input.lines) {
      if (line.productId && trackedIds.has(line.productId)) {
        insertStockMovement(
          tx,
          {
            productId: line.productId,
            qtyDelta: -roundQty(line.qty),
            reason: 'sale',
            refId: bill.id,
          },
          now,
        );
      }
    }

    const khataPaise = input.payments
      .filter((payment) => payment.method === 'khata')
      .reduce((sum, payment) => sum + payment.amountPaise, 0);
    if (khataPaise > 0 && input.customerId) {
      insertKhataEntry(
        tx,
        {
          customerId: input.customerId,
          kind: 'credit_sale',
          deltaPaise: khataPaise,
          refId: bill.id,
        },
        now,
      );
    }
    return bill;
  });
}

/** A bill with its lines (in bill order) and payments; undefined if it isn't on this phone. */
export function getBill(db: Db, id: string): SavedBill | undefined {
  const bill = db.select().from(bills).where(eq(bills.id, id)).get();
  if (!bill) return undefined;
  return {
    ...bill,
    items: db
      .select()
      .from(billItems)
      .where(eq(billItems.billId, id))
      .orderBy(asc(billItems.position))
      .all(),
    payments: db
      .select()
      .from(payments)
      .where(eq(payments.billId, id))
      .orderBy(asc(payments.method))
      .all(),
  };
}

// ------------------------------------------------------------------ history (17) and cancel (18)

export type BillListRow = BillRow & {
  customerName: string | null;
  /** "cash", "upi", "khata" joined with "+" in a fixed order: "cash+upi". */
  methods: string;
  items: number;
};

export type BillRange = { from?: Date; to?: Date };

/** 17 Bills: newest first, cancelled ones included; search by bill number or customer name. */
export function listBills(
  db: Db,
  { from, to, query = '', limit = 200 }: BillRange & { query?: string; limit?: number } = {},
): BillListRow[] {
  const q = query.trim();
  return db
    .select({
      ...getTableColumns(bills),
      customerName: customers.name,
      methods: sql<string>`coalesce((select group_concat(m, '+') from (select distinct ${payments.method} as m from ${payments} where ${payments.billId} = ${bills.id} order by case m when 'cash' then 0 when 'upi' then 1 else 2 end)), '')`,
      items: sql<number>`(select count(*) from ${billItems} where ${billItems.billId} = ${bills.id})`,
    })
    .from(bills)
    .leftJoin(customers, eq(customers.id, bills.customerId))
    .where(
      and(
        from ? gte(bills.createdAt, from.toISOString()) : undefined,
        to ? lt(bills.createdAt, to.toISOString()) : undefined,
        q
          ? or(
              sql`${bills.number} like ${containsPattern(q)} escape '\\'`,
              sql`${customers.name} like ${containsPattern(q)} escape '\\'`,
            )
          : undefined,
      ),
    )
    .orderBy(desc(bills.createdAt))
    .limit(limit)
    .all();
}

/** The tile on 17 Bills: count and total of every matching bill (cancelled ones left out). */
export function billTotals(
  db: Db,
  { from, to, query = '' }: BillRange & { query?: string } = {},
): { bills: number; totalPaise: number } {
  const q = query.trim();
  const row = db
    .select({
      bills: sql<number>`count(*)`,
      totalPaise: sql<number>`coalesce(sum(${bills.totalPaise}), 0)`,
    })
    .from(bills)
    .leftJoin(customers, eq(customers.id, bills.customerId))
    .where(
      and(
        isNull(bills.voidedAt),
        from ? gte(bills.createdAt, from.toISOString()) : undefined,
        to ? lt(bills.createdAt, to.toISOString()) : undefined,
        q
          ? or(
              sql`${bills.number} like ${containsPattern(q)} escape '\\'`,
              sql`${customers.name} like ${containsPattern(q)} escape '\\'`,
            )
          : undefined,
      ),
    )
    .get();
  return { bills: row?.bills ?? 0, totalPaise: row?.totalPaise ?? 0 };
}

/**
 * 18 Bill detail → Cancel bill (Screen Flow 18): voided_at is set once, every item sold on it goes
 * back on the shelf (a `void` movement), and a khata part comes off the customer's khata again (an
 * `adjustment`). All in one transaction, the bill's update first in the outbox.
 */
export function voidBill(db: Db, id: string, now = new Date()): void {
  db.transaction((tx) => {
    const bill = tx.select().from(bills).where(eq(bills.id, id)).get();
    if (!bill) throw new RepoError('BILL_NOT_FOUND', 'This bill isn’t on this phone');
    if (bill.voidedAt) throw new RepoError('BILL_ALREADY_VOIDED', 'This bill is already cancelled');
    const at = now.toISOString();
    tx.update(bills).set({ voidedAt: at, updatedAt: at }).where(eq(bills.id, id)).run();
    enqueue(tx, 'bills', 'update', { id, voidedAt: at }, at);

    const sold = tx
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.refId, id), eq(stockMovements.reason, 'sale')))
      .all();
    for (const movement of sold) {
      insertStockMovement(
        tx,
        { productId: movement.productId, qtyDelta: -movement.qtyDelta, reason: 'void', refId: id },
        now,
      );
    }

    const credit = tx
      .select()
      .from(khataEntries)
      .where(and(eq(khataEntries.refId, id), eq(khataEntries.kind, 'credit_sale')))
      .all();
    for (const entry of credit) {
      insertKhataEntry(
        tx,
        {
          customerId: entry.customerId,
          kind: 'adjustment',
          deltaPaise: -entry.deltaPaise,
          refId: id,
        },
        now,
      );
    }
  });
}
