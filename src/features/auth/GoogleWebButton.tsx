// Native builds sign in with the Google Sign-In module (google.ts); this button is web-only.
export function GoogleWebButton(_props: {
  onIdToken: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  return null;
}
