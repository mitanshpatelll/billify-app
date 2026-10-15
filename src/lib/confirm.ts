import { Alert, Platform } from 'react-native';

/**
 * Asks before something that can't be undone. Alert.alert does nothing on react-native-web, so
 * the customer pages in a browser get the browser's own confirm.
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  destructive = true,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  /** Red confirm button: for deleting or undoing something. */
  destructive?: boolean;
  onConfirm: () => void;
}): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
