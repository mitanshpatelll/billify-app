import { and, asc, count, desc, eq, getTableColumns, isNull, ne, or, sql } from 'drizzle-orm';

import { MAX_PAISE, MAX_QTY, roundQty } from '@/lib/domain';
import { newId } from '@/lib/ids';
import type { Unit } from '@/lib/units';

import { billItems, products, type ProductRow } from '../schema';
import type { Db } from '../types';
import { RepoError } from './errors';
import { containsPattern, prefixPattern } from './like';
import { enqueue, insertData } from './outbox';
import { insertStockMovement } from './stock';

export type NewProduct = {
  barcode: string | null;
  name: string;
  unit: Unit;
  pricePaise: number;
  mrpPaise: number | null;
  trackStock: boolean;
  /** What's on the shelf right now: becomes the first stock movement. */
  openingStock?: number;
};

const BARCODE_PATTERN = /^[0-9A-Za-z-]{1,32}$/;

const live = isNull(products.deletedAt);

function validate(input: NewProduct): void {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 120) {
    throw new RepoError('INVALID_NAME', 'Item name must be 1 to 120 characters');
  }
  if (!Number.isInteger(input.pricePaise) || input.pricePaise < 1 || input.pricePaise > MAX_PAISE) {
    throw new RepoError('INVALID_PRICE', 'Enter the selling price');
  }
  if (input.mrpPaise !== null && input.pricePaise > input.mrpPaise) {
    // Selling above MRP is illegal in India; the server refuses it too (PRICE_ABOVE_MRP).
    throw new RepoError('PRICE_ABOVE_MRP', "Price can't be above MRP");
  }
  if (input.barcode !== null && !BARCODE_PATTERN.test(input.barcode)) {
    throw new RepoError('INVALID_BARCODE', 'This barcode has characters Billify can’t store');
  }
  const opening = input.openingStock ?? 0;
  if (opening < 0 || opening > MAX_QTY) {
    throw new RepoError('INVALID_QTY', 'Enter the stock you have now');
  }
}

/** A new product (+ its opening stock as a count adjustment), in one transaction. */
export function createProduct(db: Db, input: NewProduct, now = new Date()): ProductRow {
  validate(input);
  return db.transaction((tx) => {
    if (input.barcode !== null && findProductByBarcode(tx, input.barcode)) {
      throw new RepoError('BARCODE_EXISTS', 'An item with this barcode is already saved');
    }
    const at = now.toISOString();
    const row: ProductRow = {
      id: newId(now.getTime()),
      createdAt: at,
      updatedAt: at,
      deletedAt: null,
      barcode: input.barcode,
      name: input.name.trim(),
      unit: input.unit,
      pricePaise: input.pricePaise,
      mrpPaise: input.mrpPaise,
      lowStockAt: null,
      trackStock: input.trackStock,
    };
    tx.insert(products).values(row).run();
    enqueue(tx, 'products', 'insert', insertData(row), at);

    const opening = roundQty(input.openingStock ?? 0);
    if (row.trackStock && opening > 0) {
      insertStockMovement(tx, { productId: row.id, qtyDelta: opening, reason: 'adjustment' }, now);
    }
    return row;
  });
}

export function getProduct(db: Db, id: string): ProductRow | undefined {
  return db.select().from(products).where(eq(products.id, id)).get();
}

export function findProductByBarcode(db: Db, barcode: string): ProductRow | undefined {
  return db
    .select()
    .from(products)
    .where(and(live, eq(products.barcode, barcode)))
    .get();
}

/** Exact barcode, or names containing the query; names that start with it come first. */
export function searchProducts(db: Db, query: string, limit = 6): ProductRow[] {
  const q = query.trim();
  if (!q) return [];
  return db
    .select()
    .from(products)
    .where(
      and(
        live,
        or(eq(products.barcode, q), sql`${products.name} like ${containsPattern(q)} escape '\\'`),
      ),
    )
    .orderBy(sql`${products.name} like ${prefixPattern(q)} escape '\\' desc`, asc(products.name))
    .limit(limit)
    .all();
}

/**
 * Quick keys on the billing screen: loose items (sold by weight or volume), the ones sold most
 * first. They come from the shop's own sales, so they survive a reinstall.
 */
export function quickKeyProducts(db: Db, limit = 8): ProductRow[] {
  const sold = count(billItems.id);
  return db
    .select(getTableColumns(products))
    .from(products)
    .leftJoin(billItems, eq(billItems.productId, products.id))
    .where(and(live, ne(products.unit, 'pcs')))
    .groupBy(products.id)
    .orderBy(desc(sold), asc(products.name))
    .limit(limit)
    .all();
}

export type ProductPatch = Partial<
  Pick<ProductRow, 'barcode' | 'name' | 'pricePaise' | 'mrpPaise' | 'lowStockAt' | 'trackStock'>
>;

/**
 * Edits a product. Only fields that really change are written and pushed (an update mutation
 * with the id and those fields; last write wins on the server). Same rules as a new product.
 */
export function updateProduct(
  db: Db,
  id: string,
  input: ProductPatch,
  now = new Date(),
): ProductRow {
  // An explicit undefined means "not changing": it must not override the stored value.
  const patch = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as ProductPatch;
  return db.transaction((tx) => {
    const current = getProduct(tx, id);
    if (!current || current.deletedAt)
      throw new RepoError('PRODUCT_NOT_FOUND', 'This item is gone');
    const next: ProductRow = {
      ...current,
      ...patch,
      name: patch.name !== undefined ? patch.name.trim() : current.name,
      lowStockAt:
        patch.lowStockAt !== undefined && patch.lowStockAt !== null
          ? roundQty(patch.lowStockAt)
          : (patch.lowStockAt ?? current.lowStockAt),
    };
    validate({ ...next, openingStock: 0 });
    if (next.lowStockAt !== null && (next.lowStockAt < 0 || next.lowStockAt > MAX_QTY)) {
      throw new RepoError('INVALID_QTY', 'Enter the stock level to warn at');
    }
    if (next.barcode !== null && next.barcode !== current.barcode) {
      const other = findProductByBarcode(tx, next.barcode);
      if (other && other.id !== id) {
        throw new RepoError('BARCODE_EXISTS', 'An item with this barcode is already saved');
      }
    }
    const changed = Object.fromEntries(
      (Object.keys(patch) as (keyof ProductPatch)[])
        .filter((key) => next[key] !== current[key])
        .map((key) => [key, next[key]]),
    );
    if (Object.keys(changed).length === 0) return current;
    const at = now.toISOString();
    tx.update(products)
      .set({ ...changed, updatedAt: at })
      .where(eq(products.id, id))
      .run();
    enqueue(tx, 'products', 'update', { id, ...changed }, at);
    return { ...next, updatedAt: at };
  });
}

/**
 * Removes a product from the catalog (soft delete: old bills keep their lines, and its barcode
 * is free for a new item). Synced as an update that sets deletedAt.
 */
export function deleteProduct(db: Db, id: string, now = new Date()): void {
  db.transaction((tx) => {
    const current = getProduct(tx, id);
    if (!current || current.deletedAt) return;
    const at = now.toISOString();
    tx.update(products).set({ deletedAt: at, updatedAt: at }).where(eq(products.id, id)).run();
    enqueue(tx, 'products', 'update', { id, deletedAt: at }, at);
  });
}
