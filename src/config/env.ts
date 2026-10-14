import Constants from 'expo-constants';

// EXPO_PUBLIC_* values are inlined into the bundle at build time.
// Only public values belong here: never put a secret in an EXPO_PUBLIC_ variable.
// Each one must be read as process.env.EXPO_PUBLIC_X literally, or it isn't inlined.
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const webUrl = process.env.EXPO_PUBLIC_WEB_URL;

if (!apiUrl || !webUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL or EXPO_PUBLIC_WEB_URL is not set. Copy .env.example to .env and fill it in.',
  );
}

export const env = {
  apiUrl,
  webUrl,
  variant: (Constants.expoConfig?.extra?.variant ?? 'development') as
    'development' | 'preview' | 'production',
} as const;
