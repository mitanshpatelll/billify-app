import { api, ApiError } from '@/api/client';
import { startSync, stopSync } from '@/sync/scheduler';

import { signOut } from './sign-out';

/**
 * Deletes the account on the server (DELETE /v1/me: the shop with everything in it, then the
 * user), then signs out here, which clears this phone. Sync stops first, so no push races the
 * delete, and starts again if the delete fails. Needs the internet; throws ApiError otherwise.
 */
export async function deleteAccount(): Promise<void> {
  stopSync();
  try {
    const { response } = await api.DELETE('/v1/me');
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP_${response.status}`, response.statusText);
    }
  } catch (error) {
    startSync();
    throw error;
  }
  signOut();
}
