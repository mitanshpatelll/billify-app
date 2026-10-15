import { Camera, CircleCheck, Search, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ScannerPreview } from '@/features/billing/components/ScannerPreview';
import { Badge, Button, Icon, ListGroup, Screen, StackHeader, Text } from '@/ui';

import { finishSetup } from './shop';

const POINTS: { icon: LucideIcon; title: string; subtitle: string }[] = [
  {
    icon: CircleCheck,
    title: 'Adds items in under a second',
    subtitle: 'Fastest at a busy counter',
  },
  {
    icon: ShieldCheck,
    title: 'Nothing is recorded or uploaded',
    subtitle: 'The camera only reads barcodes',
  },
  {
    icon: Search,
    title: 'You can still search by name',
    subtitle: 'Quick keys and search always work',
  },
];

/** 10 Camera permission: last setup step. Allow → billing with the scanner; Not now → search only. */
export function CameraPermissionScreen() {
  // Finishing setup flips the shop route guard, which opens the tabs by itself.
  // Billing slice: Allow calls Camera.requestCameraPermission() from vision-camera first,
  // and "denied twice" shows an Open settings button (Linking.openSettings()).
  return (
    <Screen
      header={<StackHeader right={<Badge label="Step 2 of 2" />} />}
      footer={
        <>
          <Button label="Allow camera" icon={Camera} onPress={finishSetup} />
          <Pressable
            accessibilityRole="button"
            onPress={finishSetup}
            hitSlop={8}
            style={styles.notNow}
          >
            <Text variant="bodyStrong" tone="primary">
              Not now
            </Text>
          </Pressable>
        </>
      }
    >
      <ScannerPreview hint="Hold steady over the barcode" showFlash={false} />

      <View style={styles.heading}>
        <Text variant="titleLarge" accessibilityRole="header">
          Allow the camera to scan barcodes
        </Text>
        <Text variant="body" tone="muted">
          Point the phone at a product’s barcode to add it to the bill.
        </Text>
      </View>

      <ListGroup>
        {POINTS.map((point) => (
          <View key={point.title} style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon icon={point.icon} color="primary" />
            </View>
            <View style={styles.pointText}>
              <Text variant="bodyStrong">{point.title}</Text>
              <Text variant="bodySecondary" tone="muted">
                {point.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  heading: {
    gap: theme.space.xs,
    paddingVertical: theme.space.xs,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.md,
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1, gap: 2 },
  notNow: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
