// The web build signs customers in with the OAuth redirect flow (M2), not the native module.
export const googleSignInAvailable = false;

export async function getGoogleIdToken(): Promise<string | null> {
  throw new Error('Native Google sign-in is not available on the web');
}

export async function signOutOfGoogle(): Promise<void> {}
