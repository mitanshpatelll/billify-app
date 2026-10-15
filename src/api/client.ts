import createClient from 'openapi-fetch';

import { env } from '@/config/env';
import { currentToken, useSession } from '@/features/auth/session-store';

import type { paths } from './schema';

// Render's free instance takes up to a minute to wake after 15 idle minutes.
const TIMEOUT_MS = 60_000;

/** Every failed call becomes this. Screens switch on `code`, never on `message`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchWithTimeout(request: Request): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) throw new ApiError(0, 'TIMEOUT', 'The server took too long');
    throw new ApiError(0, 'NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

/** Typed client generated from billify-api's OpenAPI file (`pnpm api:types`). */
export const api = createClient<paths>({ baseUrl: env.apiUrl, fetch: fetchWithTimeout });

// Set by query-client.ts (which imports this file, so it can't be imported back here).
let queryCacheClearer: (() => void) | undefined;
export function onSessionEnded(clear: () => void): void {
  queryCacheClearer = clear;
}

// Every call carries the session (Better Auth bearer plugin). A 401 on a call that sent one
// means the session ended (30 days without opening the app, or signed out elsewhere): forget it,
// and the route guards send the user back to sign in. Local shop data stays on the phone.
api.use({
  onRequest({ request }) {
    const token = currentToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    // Headers are changed in place. Returning the request would fail openapi-fetch's
    // `instanceof Request` check on React Native (the global differs from its own).
  },
  onResponse({ request, response }) {
    const sent = request.headers.get('Authorization');
    if (response.status === 401 && sent && sent === `Bearer ${currentToken()}`) {
      useSession.getState().signOut();
      // Nothing cached for this session may reach the next one.
      queryCacheClearer?.();
    }
    // Nothing returned: the response passes through unchanged (see onRequest).
  },
});

type ErrorBody = { error?: { code?: string; message?: string } };

/** The data of a successful call, or an ApiError with the API's error code. */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;
  if (response.ok && data !== undefined) return data;
  const body = (error ?? {}) as ErrorBody;
  throw new ApiError(
    response.status,
    body.error?.code ?? `HTTP_${response.status}`,
    body.error?.message ?? response.statusText,
  );
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
