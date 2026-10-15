import type { KhataKind } from '@/lib/domain';
import { newId } from '@/lib/ids';

import { khataEntries, type KhataEntryRow } from '../schema';
import type { Db } from '../types';
import { enqueue, insertData } from './outbox';

type NewEntry = {
  customerId: string;
  kind: KhataKind;
  deltaPaise: number;
  refId?: string | null;
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
  };
  tx.insert(khataEntries).values(row).run();
  enqueue(tx, 'khata_entries', 'insert', insertData(row), at);
  return row;
}
