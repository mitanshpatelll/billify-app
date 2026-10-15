import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { formatRupees, lineTotalPaise } from '@/lib/money';
import { paymentLabel, paymentName, type PaymentMethod } from '@/lib/payments';
import { formatQty, type Unit } from '@/lib/units';
import { Badge, Money, Text, Tile } from '@/ui';

type Item = { name: string; qty: number; unit: Unit; unitPricePaise: number };
type Payment = { method: PaymentMethod; amountPaise: number };

// Gram items carry a per-gram price; customers read loose goods per kg ("₹160.00 / kg").
function unitPrice(unit: Unit, paise: number) {
  return unit === 'g' ? `${formatRupees(paise * 1000)} / kg` : formatRupees(paise);
}

/**
 * The bill as the customer reads it (21, 23, a query thread): lines, total, how it was paid.
 * Without `payments` it is just the lines and the total.
 */
export function BillItemsTile({
  items,
  totalPaise,
  payments,
  voided = false,
}: {
  items: Item[];
  totalPaise: number;
  payments?: Payment[];
  voided?: boolean;
}) {
  return (
    <Tile>
      <View style={styles.spread}>
        <Text variant="label" tone="muted">
          Items
        </Text>
        <Text variant="label" tone="muted">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <View style={styles.items}>
        {items.map((item, index) => (
          <View key={`${index}-${item.name}`} style={styles.item}>
            <View style={styles.flex}>
              <Text variant="body">{item.name}</Text>
              <Text variant="caption" tone="muted">
                {formatQty(item.qty, item.unit)} × {unitPrice(item.unit, item.unitPricePaise)}
              </Text>
            </View>
            <Money paise={lineTotalPaise(item.qty, item.unitPricePaise)} variant="body" />
          </View>
        ))}
      </View>

      <View style={styles.dashed} />

      <View style={styles.totalRow}>
        <Text variant="titleScreen">Total</Text>
        {payments && payments.length > 0 ? <Badge label={paymentLabel(payments)} /> : null}
        <View style={styles.flex} />
        <Money paise={totalPaise} variant="total" style={voided ? styles.struck : undefined} />
      </View>

      {payments && payments.length > 1 ? (
        <View style={styles.payments}>
          {payments.map((payment, index) => (
            <View key={`${index}-${payment.method}`} style={styles.spread}>
              <Text variant="bodySecondary" tone="muted">
                {paymentName(payment.method)}
              </Text>
              {/* Haldi is for amounts due on khata only (DESIGN.md). */}
              <Money
                paise={payment.amountPaise}
                variant="bodySecondary"
                tone={payment.method === 'khata' ? 'khata' : 'muted'}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Tile>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  spread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  items: {
    gap: theme.space.sm,
    paddingVertical: theme.space.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
  },
  dashed: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.outline,
    marginVertical: theme.space.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingTop: theme.space.xs,
  },
  struck: { textDecorationLine: 'line-through' },
  payments: {
    gap: theme.space.xxs,
    paddingTop: theme.space.sm,
  },
}));
