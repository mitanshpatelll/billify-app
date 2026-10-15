import { ApiError, fetchWithTimeout } from '@/api/client';
import { env } from '@/config/env';

import type { SessionUser } from './session-store';

export type SignedIn = { token: string; user: SessionUser };

type ErrorBody = { code?: string; message?: string; error?: { code?: string; message?: string } };

// Better Auth's routes (/api/auth/*) aren't in the OpenAPI file and answer errors as
// { code, message }; /v1 routes use { error: { code, message } }. Both become ApiError.
async function post(path: string, body: unknown, token?: string): Promise<Response> {
  const response = await fetchWithTimeout(
    new Request(`${env.apiUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    }),
  );
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(
      response.status,
      error.error?.code ?? error.code ?? `HTTP_${response.status}`,
      error.error?.message ?? error.message ?? response.statusText,
    );
  }
  return response;
}

type BetterAuthUser = { id: string; name: string; email: string };

/** Pulls the session out of a Better Auth sign-in response (bearer plugin header, or body). */
export async function readSignIn(response: Response): Promise<SignedIn> {
  const body = (await response.json()) as { token?: string; user?: BetterAuthUser };
  const token = response.headers.get('set-auth-token') ?? body.token;
  if (!token || !body.user) throw new ApiError(500, 'BAD_SIGN_IN', 'Sign-in returned no session');
  return { token, user: { id: body.user.id, name: body.user.name, email: body.user.email } };
}

/** Native Google sign-in: the ID token goes to Better Auth, which checks it with Google. */
export async function signInWithGoogle(idToken: string): Promise<SignedIn> {
  return readSignIn(
    await post('/api/auth/sign-in/social', { provider: 'google', idToken: { token: idToken } }),
  );
}

/** Development builds only, against an API started with DEV_SIGN_IN=true. */
export async function signInForDevelopment(email: string): Promise<SignedIn> {
  return readSignIn(await post('/v1/dev/sign-in', { email }));
}

/** Ends the session on the server. Best effort: signing out on the phone never waits for it. */
export async function signOutOnServer(token: string): Promise<void> {
  await post('/api/auth/sign-out', {}, token).catch(() => undefined);
}
