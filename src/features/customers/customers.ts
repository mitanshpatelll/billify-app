import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { customersRepo } from '@/db/repos';
import type { NewCustomer } from '@/db/repos/customers';
import type { CustomerRow } from '@/db/schema';

export type Customer = CustomerRow;
export { formatPhone, maskPhone } from '@/lib/phone';

export function useCustomers(query: string): Customer[] {
  return useDbQuery(['customers'], () => customersRepo.searchCustomers(db, query), [query]);
}

export function useCustomer(id: string | null | undefined): Customer | null {
  return useDbQuery(
    ['customers'],
    () => (id ? (customersRepo.getCustomer(db, id) ?? null) : null),
    [id],
  );
}

/** Saves a new customer. Throws RepoError (INVALID_NAME, INVALID_PHONE). */
export function addCustomer(input: NewCustomer): Customer {
  return customersRepo.createCustomer(db, input);
}
