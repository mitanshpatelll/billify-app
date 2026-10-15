import { formatBillNumber } from './bill-number';
import { newId, newPublicToken } from './ids';
import { formatRupees, lineTotalPaise, parseRupees } from './money';
import { formatPhone, maskPhone, normalizePhone } from './phone';
import { parseQty } from './units';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId (UUID v7, same layout as the API)', () => {
  it('has the version and variant bits', () => {
    for (let i = 0; i < 50; i++) expect(newId()).toMatch(UUID_V7);
  });
  it('starts with the time in ms and sorts by it', () => {
    const now = Date.UTC(2026, 9, 15, 10, 0, 0);
    expect(parseInt(newId(now).replace(/-/g, '').slice(0, 12), 16)).toBe(now);
    expect(newId(1_000) < newId(2_000)).toBe(true);
  });
});

it('makes 22-character base64url bill tokens', () => {
  expect(newPublicToken()).toMatch(/^[A-Za-z0-9_-]{22}$/);
});

it('pads bill numbers to 3 digits', () => {
  expect(formatBillNumber('A', 7)).toBe('A-007');
  expect(formatBillNumber('SK', 1234)).toBe('SK-1234');
});

describe('money', () => {
  it('formats with Indian grouping', () => {
    expect(formatRupees(123456700)).toBe('₹12,34,567.00');
    expect(formatRupees(-5050)).toBe('-₹50.50');
    expect(formatRupees(123456, { showPaise: false })).toBe('₹1,235');
  });
  it('parses what a shopkeeper types', () => {
    expect(parseRupees('₹1,240.5')).toBe(124050);
    expect(parseRupees('25')).toBe(2500);
    expect(parseRupees('2.555')).toBeNull();
    expect(parseRupees('abc')).toBeNull();
  });
  it('rounds line totals to whole paise', () => {
    expect(lineTotalPaise(0.25, 4400)).toBe(1100);
    expect(lineTotalPaise(0.333, 1000)).toBe(333);
  });
});

describe('phone', () => {
  it.each([
    ['98765 04521', '9876504521'],
    ['+91 98765-04521', '9876504521'],
    ['919876504521', '9876504521'],
    ['09876504521', '9876504521'],
    ['12345 67890', null],
    ['98765', null],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
  it('formats and masks', () => {
    expect(formatPhone('9876504521')).toBe('+91 98765 04521');
    expect(maskPhone('9876504521')).toBe('•••• 4521');
  });
});

describe('parseQty', () => {
  it.each([
    ['12', 12],
    ['2.5', 2.5],
    [' 0.250 ', 0.25],
    ['1,5', null],
    ['2 kg', null],
    ['0.0001', null],
    ['', null],
  ])('parses %j', (input, expected) => {
    expect(parseQty(input)).toBe(expected);
  });
});
