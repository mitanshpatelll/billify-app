import { discountPaise, type CartLine } from './cart-store';

jest.mock('@/lib/kv', () => ({
  kvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
}));

const line = (qty: number, unitPricePaise: number): CartLine => ({
  productId: `p-${qty}-${unitPricePaise}`,
  name: 'Item',
  unit: 'kg',
  qty,
  unitPricePaise,
});

describe('discountPaise', () => {
  const lines = [line(2, 4400), line(1, 11440)]; // ₹88.00 + ₹114.40 = ₹202.40

  it('takes the paise off for a round-off', () => {
    expect(discountPaise(lines, { kind: 'roundoff' })).toBe(40);
    expect(discountPaise([line(1, 5000)], { kind: 'roundoff' })).toBe(0);
  });

  it('never rounds a bill under a rupee down to nothing', () => {
    expect(discountPaise([line(1, 60)], { kind: 'roundoff' })).toBe(0);
  });

  it('uses a typed amount as it is, and nothing for none (or an old draft)', () => {
    expect(discountPaise(lines, { kind: 'amount', paise: 1000 })).toBe(1000);
    expect(discountPaise(lines, { kind: 'none' })).toBe(0);
    expect(discountPaise(lines, undefined)).toBe(0);
  });
});
