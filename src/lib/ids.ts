import { getRandomBytes, randomUUID } from 'expo-crypto';

// Rows get their id on the phone, so they exist before the server sees them.
// TODO(sync slice): switch to UUID v7 (time-ordered) as the Backend Guide specifies.
export function newId(): string {
  return randomUUID();
}

/** Unguessable bill link token: 16 random bytes, base64url (no padding). */
export function newPublicToken(): string {
  const bytes = getRandomBytes(16);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
