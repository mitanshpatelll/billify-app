import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus, QrCode, Share2, type LucideIcon } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { findCustomer } from '@/features/customers/customers';
import { billShareText, whatsAppLink } from '@/features/sharing/links';
import { useShop } from '@/features/shop/shop-store';
import { formatRupees } from '@/lib/money';
import { formatQty } from '@/lib/units';
import {
  Badge,
  Button,
  Icon,
  Money,
  Screen,
  StackHeader,
  Text,
  Tile,
  TileRow,
  type TileVariant,
} from '@/ui';

import { paymentLabel, useBills } from './bills-store';
import { lineTotalPaise } from './cart-store';

const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** 03 Bill saved: summary, then share on WhatsApp or show the bill QR. */
export function BillSavedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bill = useBills((state) => state.bills.find((saved) => saved.id === id));
  const shop = useShop((state) => state.shop);

  const newBill = () => router.dismissTo('/shop/bill');

  if (!bill) {
    return (
      <Screen header={<StackHeader action="close" onAction={newBill} />}>
        <Tile>
          <Text tone="muted">This bill isn’t on this phone.</Text>
        </Tile>
      </Screen>
    );
  }

  const customer = findCustomer(bill.customerId);
  const method = paymentLabel(bill.payments);
  const meta = [bill.number, timeFormat.format(new Date(bill.createdAt)), customer?.name]
    .filter(Boolean)
    .join(' · ');

  function shareOnWhatsApp() {
    if (!bill) return;
    const text = billShareText({
      shopName: shop?.name ?? 'Billify',
      billNumber: bill.number,
      totalPaise: bill.totalPaise,
      publicToken: bill.publicToken,
    });
    void Linking.openURL(whatsAppLink(text, customer?.phone));
  }

  return (
    <Screen
      header={
        <StackHeader
          action="close"
          onAction={newBill}
          right={
            <Badge
              label={`Paid by ${method}`}
              tone={method === 'Khata' ? 'due' : 'paid'}
              icon={Check}
            />
          }
        />
      }
      footer={<Button label="Start a new bill" variant="secondary" icon={Plus} onPress={newBill} />}
    >
      <View style={styles.hero}>
        <View style={styles.check}>
          <Icon icon={Check} size={32} color="onPrimary" />
        </View>
        <Text variant="titleLarge" align="center" accessibilityRole="header">
          Bill saved
        </Text>
        <Text variant="bodySecondary" tone="muted" align="center">
          {meta}
        </Text>
      </View>

      <Tile>
        <View style={styles.summaryTop}>
          <Text variant="label" tone="muted">
            Bill summary
          </Text>
          <Text variant="label" tone="muted">
            {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View style={styles.items}>
          {bill.items.map((item) => (
            <View key={item.productId} style={styles.item}>
              <View style={styles.flex}>
                <Text variant="body" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {formatQty(item.qty, item.unit)} × {formatRupees(item.unitPricePaise)}
                </Text>
              </View>
              <Money paise={lineTotalPaise(item)} variant="body" />
            </View>
          ))}
        </View>
        <View style={styles.dashed} />
        <View style={styles.totalRow}>
          <Text variant="titleScreen">Total</Text>
          <Badge label={method} />
          <View style={styles.flex} />
          <Money paise={bill.totalPaise} variant="total" />
        </View>
      </Tile>

      <TileRow>
        <ShareTile
          variant="strong"
          icon={Share2}
          title="WhatsApp"
          subtitle="Send bill link"
          onPress={shareOnWhatsApp}
        />
        <ShareTile
          icon={QrCode}
          title="Show QR"
          subtitle="Customer scans"
          onPress={() => router.push({ pathname: '/shop/bill-qr', params: { id: bill.id } })}
        />
      </TileRow>
    </Screen>
  );
}

type ShareTileProps = {
  variant?: TileVariant;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function ShareTile({ variant = 'surface', icon, title, subtitle, onPress }: ShareTileProps) {
  const strong = variant === 'strong';
  return (
    <Tile
      variant={variant}
      onPress={onPress}
      accessibilityLabel={`${title}, ${subtitle}`}
      style={styles.flex}
    >
      <View style={[styles.shareIcon, strong && styles.shareIconStrong]}>
        <Icon icon={icon} color={strong ? 'onPrimary' : 'onSurface'} />
      </View>
      <Text variant="titleNav" tone={strong ? 'onPrimary' : 'default'}>
        {title}
      </Text>
      <Text variant="bodySecondary" tone={strong ? 'onPrimaryMuted' : 'muted'}>
        {subtitle}
      </Text>
    </Tile>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  hero: {
    alignItems: 'center',
    gap: theme.space.xs,
    paddingVertical: theme.space.md,
  },
  check: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.xs,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  items: {
    gap: theme.space.sm,
    paddingVertical: theme.space.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  dashed: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.surfaceVariant,
    marginVertical: theme.space.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingTop: theme.space.xs,
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.sm,
  },
  shareIconStrong: { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
}));
