import { useQuery } from '@tanstack/react-query';

import { api, unwrap } from '@/api/client';
import { useSession } from '@/features/auth/session-store';

import { requestSync } from '@/sync/scheduler';

export type PaymentClaim = Awaited<ReturnType<typeof fetchClaims>>[number];

async function fetchClaims(customerId?: string) {
  const { claims } = await unwrap(
    api.GET('/v1/shops/me/payment-claims', {
      params: { query: { status: 'pending', customerId } },
    }),
  );
  return claims;
}

/** "I've paid" claims waiting for the shop (D27). Online; an empty list when offline. */
export function usePaymentClaims(customerId?: string) {
  const userId = useSession((state) => state.user?.id ?? 'anonymous');
  return useQuery({
    queryKey: ['payment-claims', userId, customerId ?? 'all'],
    queryFn: () => fetchClaims(customerId),
    staleTime: 0,
  });
}

/**
 * Confirm: the server writes the UPI payment in the same step (once, whichever phone answers;
 * D30), and the pull asked for here brings it to this phone.
 */
export async function confirmClaim(claim: PaymentClaim): Promise<void> {
  await unwrap(
    api.PATCH('/v1/shops/me/payment-claims/{id}', {
      params: { path: { id: claim.id } },
      body: { status: 'confirmed' },
    }),
  );
  requestSync({ force: true });
}

export async function rejectClaim(claim: PaymentClaim): Promise<void> {
  await unwrap(
    api.PATCH('/v1/shops/me/payment-claims/{id}', {
      params: { path: { id: claim.id } },
      body: { status: 'not_received' },
    }),
  );
}
