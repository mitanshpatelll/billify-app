import Constants from 'expo-constants';

// EXPO_PUBLIC_* values are inlined into the bundle at build time.
// Only public values belong here: never put a secret in an EXPO_PUBLIC_ variable.
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and fill it in.');
}

export const env = {
  apiUrl,
  variant: (Constants.expoConfig?.extra?.variant ?? 'development') as
    'development' | 'preview' | 'production',
} as const;
