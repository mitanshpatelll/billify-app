import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api, ApiError, unwrap } from '@/api/client';
import type { paths } from '@/api/schema';
import { useSession } from '@/features/auth/session-store';

type Json<P extends keyof paths, M extends 'get' | 'post'> = paths[P][M] extends {
  responses: { 200: { content: { 'application/json': infer R } } };
}
  ? R
  : never;

export type MyBillsPage = Json<'/v1/me/bills', 'get'>;
export type MyBill = Json<'/v1/me/bills/{id}', 'get'>;
export type MyKhata = Json<'/v1/me/khata', 'get'>;

// Customer screens are online-only (Architecture: TanStack Query cache, no SQLite). Keys carry
// the user id, so one account's cache never shows up for the next.
function useUserId() {
  return useSession((state) => state.user?.id ?? 'anonymous');
}

/** 22: all my bills, or one shop's (the shop chips). */
export function useMyBills(shopId?: string) {
  const userId = useUserId();
  return useInfiniteQuery({
    queryKey: ['me', userId, 'bills', 'list', shopId ?? 'all'],
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET('/v1/me/bills', { params: { query: { cursor: pageParam, limit: 20, shopId } } }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useMyBill(id: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['me', userId, 'bills', id],
    queryFn: () => unwrap(api.GET('/v1/me/bills/{id}', { params: { path: { id } } })),
    refetchOnMount: 'always', // a reply on its query may have come in since
  });
}

export function useMyKhata() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['me', userId, 'khata'],
    queryFn: () => unwrap(api.GET('/v1/me/khata')),
  });
}

export type ClaimResult = Awaited<ReturnType<typeof claimBill>>;

/**
 * "Save to Billify" (claim by link, D25): a bill with a customer saves that customer record (all
 * its bills and khata), a walk-in bill just itself. Throws ApiError (CUSTOMER_ALREADY_CLAIMED, …).
 */
export function claimBill(token: string) {
  return unwrap(api.POST('/v1/public/bills/{token}/claim', { params: { path: { token } } }));
}

/** Save to Billify from the khata page (D27): the same customer-record claim as from a bill. */
export function claimKhata(token: string) {
  return unwrap(api.POST('/v1/public/khata/{token}/claim', { params: { path: { token } } }));
}

export type QueryType = 'missing' | 'extra' | 'wrong_price' | 'other';

export function raiseQuery(billId: string, type: QueryType, note: string) {
  return unwrap(
    api.POST('/v1/bills/{id}/queries', { params: { path: { id: billId } }, body: { type, note } }),
  );
}

export function useQueryThread(id: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['queries', userId, id],
    queryFn: () => unwrap(api.GET('/v1/queries/{id}', { params: { path: { id } } })),
    refetchInterval: 30_000, // replies show up while the thread is open
  });
}

export function sendQueryMessage(id: string, body: string) {
  return unwrap(
    api.POST('/v1/queries/{id}/messages', { params: { path: { id } }, body: { body } }),
  );
}

export function resolveQuery(id: string) {
  return unwrap(
    api.PATCH('/v1/queries/{id}', { params: { path: { id } }, body: { status: 'resolved' } }),
  );
}

export function useShopQueries(status: 'open' | 'resolved' | 'all') {
  const userId = useUserId();
  return useQuery({
    queryKey: ['queries', userId, 'shop', status],
    queryFn: () => unwrap(api.GET('/v1/shops/me/queries', { params: { query: { status } } })),
  });
}

/** 15 → Unlink: the shop takes back a wrong claim. */
export async function unlinkCustomer(id: string) {
  const { response } = await api.DELETE('/v1/shops/me/customers/{id}/link', {
    params: { path: { id } },
  });
  if (!response.ok)
    throw new ApiError(response.status, `HTTP_${response.status}`, response.statusText);
}

export const QUERY_TYPE_LABEL: Record<QueryType, string> = {
  missing: 'Item missing',
  extra: 'Extra item',
  wrong_price: 'Wrong price',
  other: 'Something else',
};
