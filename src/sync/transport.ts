import { api, unwrap } from '@/api/client';

import type { SyncTransport } from './engine';

/** The real sync calls through the typed API client (session header added by its middleware). */
export const apiTransport: SyncTransport = {
  async push(body) {
    return unwrap(api.POST('/v1/sync/push', { body }));
  },
  async pull(cursor, limit) {
    return unwrap(api.GET('/v1/sync/pull', { params: { query: { cursor, limit } } }));
  },
};
