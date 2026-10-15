import type { StockReason } from '@/lib/domain';
import { newId } from '@/lib/ids';

import { stockMovements, type StockMovementRow } from '../schema';
import type { Db } from '../types';
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
