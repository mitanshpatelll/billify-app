import { and, asc, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';

import { MAX_QTY, roundQty, type StockReason } from '@/lib/domain';
import { newId } from '@/lib/ids';

import { products, stockMovements, type ProductRow, type StockMovementRow } from '../schema';
import type { Db } from '../types';
import { RepoError } from './errors';
import { containsPattern } from './like';
import { enqueue, insertData } from './outbox';

type NewMovement = {
  productId: string;
  qtyDelta: number;
  reason: StockReason;
  refId?: string | null;
};

/** One stock ledger row + its outbox entry. Call inside the caller's transaction. */
export function insertStockMovement(tx: Db, input: NewMovement, now: Date): StockMovementRow {
  const at = now.toISOString();
  const row: StockMovementRow = {
    id: newId(now.getTime()),
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    productId: input.productId,
    qtyDelta: input.qtyDelta,
    reason: input.reason,
    refId: input.refId ?? null,
  };
  tx.insert(stockMovements).values(row).run();
  enqueue(tx, 'stock_movements', 'insert', insertData(row), at);
  return row;
}

// ------------------------------------------------------------------ levels

/** In stock = SUM(qty_delta) of the product's movements (ledger stock, Backend Guide §5). */
const inStock = sql<number>`round(coalesce(sum(${stockMovements.qtyDelta}), 0), 3)`;

export type StockLevel = ProductRow & { inStock: number; low: boolean; out: boolean };

/** Low = at or below the product's alert level (0 when none is set). Out = at or below 0. */
function withFlags(row: ProductRow & { inStock: number }): StockLevel {
  const threshold = row.lowStockAt ?? 0;
  return {
    ...row,
    low: row.trackStock && row.inStock <= threshold,
    out: row.trackStock && row.inStock <= 0,
  };
}

function levelsQuery(db: Db) {
  return db
    .select({ ...getTableColumns(products), inStock })
    .from(products)
    .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
    .where(isNull(products.deletedAt))
    .groupBy(products.id);
}

export type StockFilter = 'all' | 'low' | 'out';

/** 12 Stock: every live product with its stock, name order; optional search and filter. */
export function stockLevels(
  db: Db,
  { query = '', filter = 'all' as StockFilter } = {},
): StockLevel[] {
  const q = query.trim();
  const rows = (
    q
      ? db
          .select({ ...getTableColumns(products), inStock })
          .from(products)
          .leftJoin(stockMovements, eq(stockMovements.productId, products.id))
          .where(
            and(
              isNull(products.deletedAt),
              sql`(${products.name} like ${containsPattern(q)} escape '\\' or ${products.barcode} = ${q})`,
            ),
          )
          .groupBy(products.id)
          .orderBy(sql`${products.name} collate nocase`)
          .all()
      : levelsQuery(db)
          .orderBy(sql`${products.name} collate nocase`)
          .all()
  ).map(withFlags);
  if (filter === 'low') return rows.filter((row) => row.low);
  if (filter === 'out') return rows.filter((row) => row.out);
  return rows;
}

export type StockSummary = { items: number; low: number; out: number; valuePaise: number };

/** The tiles on 12 Stock. Value is at selling price (products have no cost price). */
export function stockSummary(db: Db): StockSummary {
  const rows = levelsQuery(db).all().map(withFlags);
  return {
    items: rows.length,
    low: rows.filter((row) => row.low).length,
    out: rows.filter((row) => row.out).length,
    valuePaise: Math.round(
      rows
        .filter((row) => row.trackStock && row.inStock > 0)
        .reduce((sum, row) => sum + row.inStock * row.pricePaise, 0),
    ),
  };
}

/** 14 Low stock: tracked items at or below their alert level, the emptiest first. */
export function lowStock(db: Db): StockLevel[] {
  return levelsQuery(db)
    .all()
    .map(withFlags)
    .filter((row) => row.low)
    .sort((a, b) => a.inStock - b.inStock || a.name.localeCompare(b.name));
}

export function stockOf(db: Db, productId: string): number {
  const row = db
    .select({ inStock })
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId))
    .get();
  return row?.inStock ?? 0;
}

/** A product's ledger, newest first (product detail). */
export function movementsFor(db: Db, productId: string, limit = 50): StockMovementRow[] {
  return db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId))
    .orderBy(desc(stockMovements.createdAt), asc(stockMovements.id))
    .limit(limit)
    .all();
}

// ------------------------------------------------------------------ writes

/** 13 Stock in: one purchase movement per received line, all in one transaction. */
export function receiveStock(
  db: Db,
  lines: { productId: string; qty: number }[],
  now = new Date(),
): void {
  const clean = lines.map((line) => ({ ...line, qty: roundQty(line.qty) }));
  if (clean.length === 0) throw new RepoError('EMPTY_STOCK_IN', 'Add an item first');
  for (const line of clean) {
    if (!(line.qty > 0) || line.qty > MAX_QTY) {
      throw new RepoError('INVALID_QTY', 'Check the quantities');
    }
  }
  db.transaction((tx) => {
    for (const line of clean) {
      const product = tx.select().from(products).where(eq(products.id, line.productId)).get();
      // Removed meanwhile (e.g. by a pull): its stock would be invisible.
      if (!product || product.deletedAt) {
        throw new RepoError('PRODUCT_NOT_FOUND', 'One of these items was removed');
      }
      insertStockMovement(
        tx,
        { productId: line.productId, qtyDelta: line.qty, reason: 'purchase' },
        now,
      );
    }
  });
}

/**
 * Fix a count (User Flows §3): the shopkeeper counts the shelf; the difference to the ledger
 * becomes one adjustment movement. Returns the difference (0 = the count was already right).
 */
export function fixCount(db: Db, productId: string, counted: number, now = new Date()): number {
  const real = roundQty(counted);
  if (!(real >= 0) || real > MAX_QTY) throw new RepoError('INVALID_QTY', 'Enter the count');
  return db.transaction((tx) => {
    const difference = roundQty(real - stockOf(tx, productId));
    // The server caps one movement at MAX_QTY; a ledger far below 0 could need more.
    if (Math.abs(difference) > MAX_QTY) {
      throw new RepoError('INVALID_QTY', 'That count is too far from the stock on record');
    }
    if (difference !== 0) {
      insertStockMovement(tx, { productId, qtyDelta: difference, reason: 'adjustment' }, now);
    }
    return difference;
  });
}
