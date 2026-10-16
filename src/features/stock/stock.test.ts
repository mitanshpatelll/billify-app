import { env } from '@/config/env';
import { khataReminderText, reorderText } from '@/features/sharing/links';

import { suggestedOrder } from './stock';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/db/live', () => ({ useDbQuery: jest.fn() }));
jest.mock('@/config/env', () => ({
  env: { apiUrl: 'http://api.test', webUrl: 'http://web.test' },
}));

describe('suggestedOrder', () => {
  it('orders up to double the alert level', () => {
    expect(suggestedOrder({ inStock: 3, lowStockAt: 12, unit: 'pcs' })).toBe(21);
    expect(suggestedOrder({ inStock: -2, lowStockAt: 5, unit: 'pcs' })).toBe(12);
  });
  it('orders at least one (or 100 g)', () => {
    expect(suggestedOrder({ inStock: 0, lowStockAt: null, unit: 'pcs' })).toBe(1);
    expect(suggestedOrder({ inStock: 0, lowStockAt: null, unit: 'g' })).toBe(100);
  });
  it('rounds kg up to whole units', () => {
    expect(suggestedOrder({ inStock: 1.5, lowStockAt: 5, unit: 'kg' })).toBe(9);
  });
});

it('builds the reorder message', () => {
  expect(
    reorderText('Sharma Kirana', [
      { name: 'Maggi Masala 70 g', qty: 48, unit: 'pcs' },
      { name: 'Sugar (loose)', qty: 25, unit: 'kg' },
    ]),
  ).toBe(
    'Order from Sharma Kirana\n• Maggi Masala 70 g: 48\n• Sugar (loose): 25 kg\n\n' +
      `Made with Billify · ${env.webUrl}`,
  );
});

it('builds the khata reminder', () => {
  expect(
    khataReminderText({
      customerName: 'Ramesh Yadav',
      duePaise: 124_000,
      shopName: 'Sharma Kirana',
      upiId: 'sharmakirana@okaxis',
    }),
  ).toBe(
    'Namaste Ramesh Yadav, ₹1,240.00 is due at Sharma Kirana. You can pay at the shop, or by UPI to sharmakirana@okaxis. Thank you!',
  );
});

it('adds the khata page link to the reminder when the customer has one', () => {
  expect(
    khataReminderText({
      customerName: 'Ramesh Yadav',
      duePaise: 124_000,
      shopName: 'Sharma Kirana',
      upiId: 'sharmakirana@okaxis',
      khataToken: 'AAAAAAAAAAAAAAAAAAAAAA',
    }),
  ).toMatch(new RegExp(`\\nPay or tell us you paid: ${env.webUrl}/k/AAAAAAAAAAAAAAAAAAAAAA$`));
});
