import { CameraView, useCameraPermissions } from 'expo-camera';
import { CameraOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet as RNStyleSheet, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon, Text } from '@/ui';

import { createScanGate, PRODUCT_BARCODES } from '../scan-gate';
import { ScannerPreview } from './ScannerPreview';

// Same object every render: a new one would resend the settings to the camera each time.
const SCANNER_SETTINGS = { barcodeTypes: [...PRODUCT_BARCODES] };

type BarcodeScannerProps = {
  onScan: (code: string) => void;
  /** Off while another screen covers this one: only one camera can run at a time. */
  active: boolean;
  hint?: string;
};

/**
 * The live scanner tile (expo-camera, D20). Without camera permission, or if the camera can't
 * start, it says so in the tile and offers a fix; search and quick keys keep working either way
 * (User Flows §2, edge cases).
 */
export function BarcodeScanner({ onScan, active, hint }: BarcodeScannerProps) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gate] = useState(() => createScanGate());

  // Permission can change in Settings while the app is in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getPermission();
    });
    return () => subscription.remove();
  }, [getPermission]);

  // Back from quick add / checkout: the packet still in hand must not count again.
  useEffect(() => {
    if (active) gate.resume();
  }, [active, gate]);

  const live = !!permission?.granted && active && !failed;

  if ((permission && !permission.granted) || failed) {
    const settings = failed || !permission?.canAskAgain;
    const fix = () => {
      setFailed(false);
      if (settings) Linking.openSettings().catch(() => undefined);
      else void requestPermission();
    };
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Camera is off. ${settings ? 'Open settings' : 'Allow camera'}`}
        onPress={fix}
        style={styles.off}
      >
        <Icon icon={CameraOff} size={24} color="tertiary" />
        <Text variant="bodyStrong" style={styles.offTitle}>
          {failed ? 'Camera didn’t start' : 'Camera is off'}
        </Text>
        <Text variant="bodySecondary" style={styles.offText} align="center">
          {failed
            ? 'Another app may be using it, or it was turned off in Settings. Tap to check.'
            : settings
              ? 'Turn on the camera for Billify in Settings to scan barcodes.'
              : 'Tap to allow the camera and scan barcodes.'}{' '}
          Search and quick keys work without it.
        </Text>
      </Pressable>
    );
  }

  return (
    <ScannerPreview
      hint={hint}
      live={live}
      flashOn={flashOn}
      onFlash={() => setFlashOn((on) => !on)}
      camera={
        live ? (
          <CameraView
            style={RNStyleSheet.absoluteFill}
            facing="back"
            enableTorch={flashOn}
            barcodeScannerSettings={SCANNER_SETTINGS}
            onMountError={() => setFailed(true)}
            onBarcodeScanned={({ data }) => {
              if (gate.accept(data)) onScan(data);
            }}
          />
        ) : (
          // Permission still loading, or another screen on top: the dark frame on its own.
          <View style={RNStyleSheet.absoluteFill} />
        )
      }
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  off: {
    height: theme.sizes.scanner,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.camera,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.xl,
  },
  offTitle: { color: theme.colors.onPrimary },
  offText: { color: theme.colors.surfaceVariant },
}));
