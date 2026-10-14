import { newId } from '@/lib/ids';

export type Customer = {
  id: string;
  name: string;
  /** 10-digit Indian mobile number, no +91. */
  phone: string | null;
};

// Sample shop data for the UI pass. Replaced by customersRepo (SQLite) in the khata slice.
export const SAMPLE_CUSTOMERS: Customer[] = [
  { id: newId(), name: 'Ramesh Yadav', phone: '9876504521' },
  { id: newId(), name: 'Sunita Devi', phone: '9812207734' },
  { id: newId(), name: 'Mohd. Arif', phone: '9900112233' },
  { id: newId(), name: 'Priya Shah', phone: '9823456710' },
  { id: newId(), name: 'Gopal Verma', phone: null },
];

export function findCustomer(id: string | null): Customer | null {
  return SAMPLE_CUSTOMERS.find((customer) => customer.id === id) ?? null;
}

/** "+91 98765 04521" */
export function formatPhone(phone: string): string {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}
