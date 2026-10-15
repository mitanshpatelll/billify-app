import { getRandomBytes } from 'expo-crypto';

function hex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

/**
 * Row id, made on the phone so rows exist before the server sees them.
 * UUID v7 (RFC 9562): 48-bit Unix time in ms, then random bits, so ids sort by creation time.
 * Same layout as billify-api's uuidv7().
 */
export function newId(now: number = Date.now()): string {
  const bytes = getRandomBytes(16);
  // 48-bit big-endian timestamp. Bit shifts are 32-bit in JS, so split it by division.
  let time = now;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10xx
  const h = hex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Unguessable bill link token: 16 random bytes, base64url (no padding). */
export function newPublicToken(): string {
  const bytes = getRandomBytes(16);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
