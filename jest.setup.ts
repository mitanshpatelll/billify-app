/// <reference types="node" />

// expo-crypto is a native module: tests use Node's crypto behind the same API.
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual<typeof import('node:crypto')>('node:crypto');
  return {
    getRandomBytes: (count: number) => new Uint8Array(crypto.randomBytes(count)),
    randomUUID: () => crypto.randomUUID(),
  };
});
