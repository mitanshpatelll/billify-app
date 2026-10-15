import { useEffect, useEffectEvent, useRef } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { env } from '@/config/env';

type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let loading: Promise<GoogleIdentity> | null = null;

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  loading ??= new Promise((resolve, reject) => {
    if (window.google) return resolve(window.google);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google) return resolve(window.google);
      loading = null; // let the next try load it again
      reject(new Error('Google sign-in didn’t load'));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('Couldn’t load Google sign-in. Check your internet connection.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Web sign-in (D25): Google Identity Services draws its own button and hands back an ID token,
 * which goes to the same /api/auth/sign-in/social call as on the phone. No OAuth redirect: its
 * cookie would live on the API's domain, a third-party cookie for this page.
 */
export function GoogleWebButton({
  onIdToken,
  onError,
}: {
  onIdToken: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  const ref = useRef<View>(null);
  const tokenReceived = useEffectEvent(onIdToken);
  const failed = useEffectEvent(onError);

  // Drawn once: the callbacks are effect events, so a re-render doesn't redraw Google's button.
  useEffect(() => {
    const clientId = env.googleWebClientId;
    if (!clientId) return;
    let live = true;
    loadGoogleIdentity()
      .then((google) => {
        const parent = ref.current as unknown as HTMLElement | null;
        if (!live || !parent) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (credential) tokenReceived(credential);
          },
        });
        google.accounts.id.renderButton(parent, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        });
      })
      .catch((err: Error) => {
        if (live) failed(err.message);
      });
    return () => {
      live = false;
    };
  }, []);

  return <View ref={ref} style={styles.slot} />;
}

const styles = StyleSheet.create({
  slot: { alignItems: 'center', minHeight: 44 },
});
