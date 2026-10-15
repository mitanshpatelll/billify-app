import { api, isApiError, unwrap } from '@/api/client';
import type { paths } from '@/api/schema';

export type ServerShop =
  paths['/v1/shops/me']['get']['responses'][200]['content']['application/json']['shop'];

/**
 * The signed-in owner's shop, or null for a new owner (404 SHOP_NOT_FOUND). `token` is for the
 * moment right after sign-in, before the session is stored.
 */
export async function fetchMyShop(token?: string): Promise<ServerShop | null> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return (await unwrap(api.GET('/v1/shops/me', { headers }))).shop;
  } catch (error) {
    if (isApiError(error, 'SHOP_NOT_FOUND')) return null;
    throw error;
  }
}

/** POST /v1/shops. A retried setup gets 409 SHOP_EXISTS: then the existing shop is loaded. */
export async function createMyShop(
  input: Pick<ServerShop, 'name' | 'upiId' | 'billPrefix'>,
): Promise<ServerShop> {
  try {
    return (await unwrap(api.POST('/v1/shops', { body: input }))).shop;
  } catch (error) {
    if (isApiError(error, 'SHOP_EXISTS')) {
      const shop = await fetchMyShop();
      if (shop) return shop;
    }
    throw error;
  }
}
