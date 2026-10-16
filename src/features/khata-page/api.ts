import { useQuery } from '@tanstack/react-query';

import { api, isApiError, unwrap } from '@/api/client';

export const KHATA_NOT_FOUND = 'KHATA_NOT_FOUND';
const NOT_FOUND_RECHECK_MS = 30_000;

/** GET /v1/public/khata/:token (no sign-in). A 404 keeps checking: the customer may still be syncing. */
export function usePublicKhata(token: string) {
  return useQuery({
    queryKey: ['public-khata', token],
    queryFn: () => unwrap(api.GET('/v1/public/khata/{token}', { params: { path: { token } } })),
    staleTime: 0,
    refetchInterval: (query) =>
      isApiError(query.state.error, KHATA_NOT_FOUND) ? NOT_FOUND_RECHECK_MS : false,
  });
}

export type PublicKhata = NonNullable<ReturnType<typeof usePublicKhata>['data']>;

/** "I've paid": the shop confirms it on its phone. Throws ApiError (TOO_MANY_CLAIMS, …). */
export function sendPaid(token: string, amountPaise: number, utr?: string) {
  return unwrap(
    api.POST('/v1/public/khata/{token}/paid', {
      params: { path: { token } },
      body: { amountPaise, utr },
    }),
  );
}
