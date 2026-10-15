import { Flashlight, FlashlightOff, ScanBarcode } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon, IconButton, Text } from '@/ui';

type ScannerPreviewProps = {
  hint?: string;
  showFlash?: boolean;
  flashOn?: boolean;
  onFlash?: () => void;
  /** The camera is running (told to screen readers). */
  live?: boolean;
  /** The live camera, drawn behind the frame. */
  camera?: ReactNode;
};

/**
 * The scanner tile: dark camera, haldi corner brackets and scan line, flash button, hint chip.
 * Without `camera` it is the still picture used on 10 Camera permission.
 */
export function ScannerPreview({
  hint = 'Point at a barcode',
  showFlash = true,
  flashOn = false,
  onFlash,
  camera,
  live = false,
}: ScannerPreviewProps) {
  return (
    <View
      style={styles.scanner}
      accessible
      accessibilityLabel={live ? 'Barcode scanner, camera on' : 'Barcode scanner'}
    >
      {camera}
      <View style={styles.frame} pointerEvents="none">
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        <View style={styles.scanLine} />
      </View>
      {showFlash ? (
        <View style={styles.flash}>
          <IconButton
            icon={flashOn ? FlashlightOff : Flashlight}
            variant="camera"
            accessibilityLabel={flashOn ? 'Turn flash off' : 'Turn flash on'}
            onPress={onFlash}
          />
        </View>
      ) : null}
      <View style={styles.hint} pointerEvents="none">
        <Icon icon={ScanBarcode} size={16} color="tertiary" />
        <Text variant="label" style={styles.hintText}>
          {hint}
        </Text>
      </View>
    </View>
  );
}

const CORNER = 22;
const STROKE = 3;

const styles = StyleSheet.create((theme) => ({
  scanner: {
    height: theme.sizes.scanner,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.camera,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frame: {
    width: '58%',
    height: 92,
    marginBottom: 22,
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: theme.colors.tertiary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    height: 2,
    marginHorizontal: 10,
    borderRadius: 1,
    backgroundColor: theme.colors.tertiary,
  },
  flash: {
    position: 'absolute',
    top: theme.space.sm,
    right: theme.space.sm,
  },
  hint: {
    position: 'absolute',
    bottom: theme.space.sm,
    height: 30,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: { color: theme.colors.onPrimary },
}));
