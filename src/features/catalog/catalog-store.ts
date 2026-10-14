import { create } from 'zustand';

import { newId } from '@/lib/ids';
import type { Unit } from '@/lib/units';

export type Product = {
  id: string;
  barcode: string | null;
  name: string;
  unit: Unit;
  pricePaise: number;
  mrpPaise: number | null;
  /** Loose items the shop sells most get a quick key on the billing screen. */
  quickKey: boolean;
  trackStock: boolean;
};

type NewProduct = Omit<Product, 'id' | 'quickKey'> & { openingStock?: number };

type CatalogState = {
  products: Product[];
  addProduct: (product: NewProduct) => Product;
};

const p = (
  name: string,
  unit: Unit,
  pricePaise: number,
  barcode: string | null = null,
  quickKey = false,
): Product => ({
  id: newId(),
  barcode,
  name,
  unit,
  pricePaise,
  mrpPaise: barcode ? pricePaise : null,
  quickKey,
  trackStock: true,
});

// Sample shop data for the UI pass. Replaced by productsRepo (SQLite) in the billing slice.
const SAMPLE_PRODUCTS: Product[] = [
  p('Sugar (loose)', 'kg', 4400, null, true),
  p('Rice (loose)', 'kg', 5200, null, true),
  p('Toor dal (loose)', 'kg', 16000, null, true),
  p('Atta (loose)', 'kg', 4200, null, true),
  p('Onion', 'kg', 4000, null, true),
  p('Amul Butter 100 g', 'pcs', 5800, '8901262150019'),
  p('Tata Salt 1 kg', 'pcs', 2800, '8904043901015'),
  p('Maggi Masala 70 g', 'pcs', 1400, '8901058851298'),
  p('Aashirvaad Atta 5 kg', 'pcs', 24500, '8901725181116'),
  p('Amul Taaza 500 ml', 'pcs', 2800, '8901262010016'),
  p('Fortune Sunflower Oil 1 L', 'pcs', 17500, '8906007280016'),
  p('Surf Excel 1 kg', 'pcs', 14000, '8901030704840'),
  p('Britannia Good Day 100 g', 'pcs', 3000, '8901063142077'),
];

export const useCatalog = create<CatalogState>()((set) => ({
  products: SAMPLE_PRODUCTS,
  addProduct: ({ openingStock: _openingStock, ...input }) => {
    const product: Product = { ...input, id: newId(), quickKey: false };
    set((state) => ({ products: [product, ...state.products] }));
    return product;
  },
}));

/** Case-insensitive name search, or an exact barcode match. */
export function searchProducts(products: Product[], query: string, limit = 6): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products
    .filter((product) => product.barcode === q || product.name.toLowerCase().includes(q))
    .slice(0, limit);
}
