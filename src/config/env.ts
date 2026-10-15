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

const variant = (Constants.expoConfig?.extra?.variant ?? 'development') as
  'development' | 'preview' | 'production';

export const env = {
  apiUrl,
  webUrl,
  variant,
  /** Google OAuth client ids (public). Empty = Google sign-in is off in this build. */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  /**
   * Development builds (JS dev mode + development variant) offer email sign-in against an API
   * started with DEV_SIGN_IN=true. Release builds never show it, whatever the variant.
   */
  devSignIn: __DEV__ && variant === 'development',
} as const;
