/**
 * The camera reports a barcode many times a second while it is in view. A scan counts once:
 * the same code counts again only after it has left the view (no sighting for `leaveMs`) and
 * come back; any code counts only `anyCodeMs` after the last one, so two packets side by side
 * don't both slip in.
 */
export function createScanGate({ leaveMs = 500, anyCodeMs = 600 } = {}) {
  let accepted: string | null = null;
  let acceptedAt = -Infinity;
  let seenCode: string | null = null;
  let seenAt = -Infinity;

  return {
    accept(code: string, now: number = Date.now()): boolean {
      const gap = code === seenCode ? now - seenAt : Infinity;
      seenCode = code;
      seenAt = now;
      if (now - acceptedAt < anyCodeMs) return false;
      if (code === accepted && gap < leaveMs) return false; // still in front of the lens
      accepted = code;
      acceptedAt = now;
      return true;
    },
    /**
     * The camera starts again (back from quick add or checkout): whatever was counted last is
     * treated as still in view, so the packet the shopkeeper is holding isn't added again.
     */
    resume(now: number = Date.now()): void {
      seenCode = accepted;
      seenAt = now;
    },
  };
}

/** Shelf barcodes: EAN / UPC on packets, Code 128 / 39 on shop-printed labels. */
export const PRODUCT_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] as const;

/** A barcode Billify can store (same rule as the server: 1–32 letters, digits, dashes). */
export function isStorableBarcode(code: string): boolean {
  return /^[0-9A-Za-z-]{1,32}$/.test(code);
}
