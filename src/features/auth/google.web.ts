import { env } from '@/config/env';

// The web build signs customers in with Google Identity Services (GoogleWebButton.web.tsx),
// not the native module: the screen shows Google's own button instead of calling this.
export const googleSignInAvailable = !!env.googleWebClientId;

export async function getGoogleIdToken(): Promise<string | null> {
  throw new Error('On the web, Google sign-in goes through GoogleWebButton');
}

export async function signOutOfGoogle(): Promise<void> {}
