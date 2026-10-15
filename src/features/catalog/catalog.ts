import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { productsRepo } from '@/db/repos';
import type { NewProduct } from '@/db/repos/products';
import type { ProductRow } from '@/db/schema';

export type Product = ProductRow;
export type { NewProduct };

/** Name or barcode search for the billing screen. */
export function useProductSearch(query: string, limit = 6): Product[] {
  return useDbQuery(['products'], () => productsRepo.searchProducts(db, query, limit), [
    query,
    limit,
  ]);
}

/** Loose items, most sold first: the quick keys under the scanner. */
export function useQuickKeys(): Product[] {
  return useDbQuery(['products', 'bill_items'], () => productsRepo.quickKeyProducts(db));
}

/** Saves a new product (+ opening stock). Throws RepoError (e.g. BARCODE_EXISTS). */
export function addProduct(input: NewProduct): Product {
  return productsRepo.createProduct(db, input);
}

export function findProductByBarcode(barcode: string): Product | undefined {
  return productsRepo.findProductByBarcode(db, barcode);
}
