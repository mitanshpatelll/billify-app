import createClient from 'openapi-fetch';

import { env } from '@/config/env';

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

async function fetchWithTimeout(request: Request): Promise<Response> {
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
