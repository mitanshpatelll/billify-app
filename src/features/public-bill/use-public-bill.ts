import { useQuery } from '@tanstack/react-query';

import { api, isApiError, unwrap } from '@/api/client';

export const BILL_NOT_FOUND = 'BILL_NOT_FOUND';

// How often a "not synced yet" bill page checks again on its own.
const NOT_FOUND_RECHECK_MS = 30_000;

/** GET /v1/public/bills/:token. No sign-in. A 404 keeps checking: the bill may still be syncing. */
export function usePublicBill(token: string) {
  return useQuery({
    queryKey: ['public-bill', token],
    queryFn: () => unwrap(api.GET('/v1/public/bills/{token}', { params: { path: { token } } })),
    refetchInterval: (query) =>
      isApiError(query.state.error, BILL_NOT_FOUND) ? NOT_FOUND_RECHECK_MS : false,
  });
}

export type PublicBill = NonNullable<ReturnType<typeof usePublicBill>['data']>;
