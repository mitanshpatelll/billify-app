import type { OutboxRow } from '@/db/schema';
import { formatRupees } from '@/lib/money';

// The server's reason codes (billify-api sync.rules.ts), in a shopkeeper's words.
const REASONS: Record<string, string> = {
  BILL_NUMBER_TAKEN: 'Another bill already has this number',
  PUBLIC_TOKEN_TAKEN: 'This bill link is already used by another bill',
  BARCODE_EXISTS: 'Another item already has this barcode',
  PRICE_ABOVE_MRP: 'The price is above the MRP',
  PRODUCT_NOT_FOUND: 'The item it belongs to never reached the server',
  CUSTOMER_NOT_FOUND: 'The customer it belongs to never reached the server',
  BILL_NOT_FOUND: 'The bill it belongs to never reached the server',
  BILL_ALREADY_VOIDED: 'This bill was already cancelled',
  ID_CONFLICT: 'Another shop already has this record',
  INVALID_DATA: 'Some of its details are not valid',
};

export function reasonText(entry: Pick<OutboxRow, 'reason' | 'message'>): string {
  return (entry.reason && REASONS[entry.reason]) || entry.message || 'The server refused it';
}

/** "Bill A-104", "Item: Tata Salt 1 kg", …: what the change was about. */
export function changeTitle(entry: Pick<OutboxRow, 'tableName' | 'op' | 'data'>): string {
  const data = entry.data as Record<string, unknown>;
  const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '');
  switch (entry.tableName) {
    case 'bills':
      return entry.op === 'update' ? 'Cancelled bill' : `Bill ${text('number')}`;
    case 'bill_items':
      return `Bill line: ${text('nameSnapshot')}`;
    case 'payments':
      return `Payment of ${formatRupees(Number(data.amountPaise) || 0)}`;
    case 'products':
      return `Item: ${text('name') || 'changed item'}`;
    case 'customers':
      return `Customer: ${text('name') || 'changed customer'}`;
    case 'stock_movements':
      return 'Stock change';
    case 'khata_entries':
      return 'Khata entry';
  }
}
