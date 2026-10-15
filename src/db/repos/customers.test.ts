/** @jest-environment node */
import { outbox } from '../schema';
import { createTestDb } from '../testing/test-db';
import type { Db } from '../types';
import { customersRepo } from '.';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

it('stores a typed mobile number as 10 digits and queues the customer', () => {
  const customer = customersRepo.createCustomer(db, {
    name: ' Ramesh Yadav ',
    phone: '+91 98765-04521',
  });
  expect(customer).toMatchObject({ name: 'Ramesh Yadav', phone: '9876504521', linkedUserId: null });
  const [entry] = db.select().from(outbox).all();
  expect(entry?.data).toEqual({
    id: customer.id,
    createdAt: customer.createdAt,
    name: 'Ramesh Yadav',
    phone: '9876504521',
    khataLimitPaise: null,
  });
});

it('sets and clears a khata limit; refuses a bad one', () => {
  const c = customersRepo.createCustomer(db, { name: 'Ramesh Yadav', phone: null });
  db.delete(outbox).run();
  expect(customersRepo.updateCustomer(db, c.id, { khataLimitPaise: 200000 }).khataLimitPaise).toBe(
    200000,
  );
  expect(db.select().from(outbox).all()[0]?.data).toEqual({ id: c.id, khataLimitPaise: 200000 });
  expect(
    customersRepo.updateCustomer(db, c.id, { khataLimitPaise: null }).khataLimitPaise,
  ).toBeNull();
  expect(() => customersRepo.updateCustomer(db, c.id, { khataLimitPaise: -5 })).toThrow(
    expect.objectContaining({ code: 'INVALID_LIMIT' }),
  );
});

it('accepts no phone, refuses a wrong one', () => {
  expect(customersRepo.createCustomer(db, { name: 'Gopal Verma', phone: '' }).phone).toBeNull();
  expect(() => customersRepo.createCustomer(db, { name: 'Sunita', phone: '12345' })).toThrow(
    expect.objectContaining({ code: 'INVALID_PHONE' }),
  );
});

it('searches by name or phone digits, sorted by name', () => {
  customersRepo.createCustomer(db, { name: 'sunita Devi', phone: '9812207734' });
  customersRepo.createCustomer(db, { name: 'Ramesh Yadav', phone: '9876504521' });
  customersRepo.createCustomer(db, { name: 'Mohd. Arif', phone: null });

  expect(customersRepo.searchCustomers(db, '').map((c) => c.name)).toEqual([
    'Mohd. Arif',
    'Ramesh Yadav',
    'sunita Devi',
  ]);
  expect(customersRepo.searchCustomers(db, 'yadav').map((c) => c.name)).toEqual(['Ramesh Yadav']);
  expect(customersRepo.searchCustomers(db, '07734').map((c) => c.name)).toEqual(['sunita Devi']);
});
