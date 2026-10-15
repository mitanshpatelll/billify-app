/** @jest-environment node */
import { ApiError } from '@/api/client';

import { readSignIn } from './auth-api';

jest.mock('@/config/env', () => ({
  env: { apiUrl: 'http://api.test', webUrl: 'http://web.test' },
}));
jest.mock('@/lib/secure-token', () => ({
  secureToken: { get: () => null, set: () => undefined, clear: async () => undefined },
}));
jest.mock('@/lib/kv', () => ({
  kvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
}));

const user = { id: 'u1', name: 'Ramesh', email: 'ramesh@example.com', image: null };

describe('readSignIn', () => {
  it('prefers the bearer plugin header', async () => {
    const response = new Response(JSON.stringify({ token: 'body-token', user }), {
      headers: { 'set-auth-token': 'header-token' },
    });
    expect(await readSignIn(response)).toEqual({
      token: 'header-token',
      user: { id: 'u1', name: 'Ramesh', email: 'ramesh@example.com' },
    });
  });

  it('falls back to the token in the body', async () => {
    const response = new Response(JSON.stringify({ token: 'body-token', user }));
    expect((await readSignIn(response)).token).toBe('body-token');
  });

  it('refuses a response without a session', async () => {
    await expect(readSignIn(new Response(JSON.stringify({ user })))).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
