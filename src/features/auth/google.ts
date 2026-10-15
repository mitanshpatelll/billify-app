import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

import { env } from '@/config/env';

/**
 * Google needs the web client id (the ID token's audience) everywhere, and on iOS the iOS client
 * id plus its reversed form as a URL scheme (added by app.config.ts when the id is set).
 */
export const googleSignInAvailable =
  !!env.googleWebClientId && (Platform.OS !== 'ios' || !!env.googleIosClientId);

let configured = false;

/** Google's ID token for the chosen account, or null if the user backed out. */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!configured) {
    GoogleSignin.configure({
      webClientId: env.googleWebClientId,
      iosClientId: env.googleIosClientId,
    });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    if (!response.data.idToken) throw new Error('Google returned no ID token');
    return response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play services are missing or out of date on this phone');
    }
    throw error;
  }
}

/** Forget the Google account choice, so the next sign-in asks again. */
export async function signOutOfGoogle(): Promise<void> {
  if (configured) await GoogleSignin.signOut().catch(() => undefined);
}
