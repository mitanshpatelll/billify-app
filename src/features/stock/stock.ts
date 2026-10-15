import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { productsRepo, stockRepo } from '@/db/repos';
import type { ProductPatch } from '@/db/repos/products';
import type { StockFilter, StockLevel, StockSummary } from '@/db/repos/stock';
import type { ProductRow, StockMovementRow } from '@/db/schema';
import type { StockReason } from '@/lib/domain';

export type { StockFilter, StockLevel };

const STOCK_TABLES = ['products', 'stock_movements'] as const;

export function useStockLevels(query: string, filter: StockFilter): StockLevel[] {
  return useDbQuery(STOCK_TABLES, () => stockRepo.stockLevels(db, { query, filter }), [
    query,
    filter,
  ]);
}

export function useStockSummary(): StockSummary {
  return useDbQuery(STOCK_TABLES, () => stockRepo.stockSummary(db));
}

export function useLowStock(): StockLevel[] {
  return useDbQuery(STOCK_TABLES, () => stockRepo.lowStock(db));
}

export function useProduct(id: string | undefined): ProductRow | null {
  return useDbQuery(['products'], () => (id ? (productsRepo.getProduct(db, id) ?? null) : null), [
    id,
  ]);
}

export function useStockOf(id: string | undefined): number {
  return useDbQuery(['stock_movements'], () => (id ? stockRepo.stockOf(db, id) : 0), [id]);
}

export function useMovements(id: string | undefined): StockMovementRow[] {
  return useDbQuery(['stock_movements'], () => (id ? stockRepo.movementsFor(db, id) : []), [id]);
}

/** Throws RepoError. */
export function receiveStock(lines: { productId: string; qty: number }[]): void {
  stockRepo.receiveStock(db, lines);
}

/** Returns the difference written (0 = the count was already right). Throws RepoError. */
export function fixCount(productId: string, counted: number): number {
  return stockRepo.fixCount(db, productId, counted);
}

/** Throws RepoError. */
export function updateProduct(id: string, patch: ProductPatch): void {
  productsRepo.updateProduct(db, id, patch);
}

export function deleteProduct(id: string): void {
  productsRepo.deleteProduct(db, id);
}

const REASONS: Record<StockReason, string> = {
  sale: 'Sold',
  purchase: 'Stock in',
  adjustment: 'Count fixed',
  return: 'Returned',
  void: 'Bill cancelled',
};

export function movementLabel(reason: StockReason): string {
  return REASONS[reason];
}

/** What to order: double the alert level, minus what's there (at least 1). Editable on 14. */
export function suggestedOrder(level: Pick<StockLevel, 'inStock' | 'lowStockAt' | 'unit'>): number {
  const target = (level.lowStockAt ?? 0) * 2;
  const qty = Math.ceil(Math.max(target - level.inStock, 0));
  return Math.max(qty, level.unit === 'g' ? 100 : 1);
}
