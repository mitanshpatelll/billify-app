import { Alert, Linking } from 'react-native';

import type { Customer } from '@/features/customers/customers';
import { billShareText, whatsAppLink } from '@/features/sharing/links';
import type { Shop } from '@/features/shop/shop';
import { maskPhone } from '@/lib/phone';

type ShareableBill = { number: string; totalPaise: number; publicToken: string };

/**
 * Sends the bill link on WhatsApp from the shopkeeper's own number. With a customer number, it
 * first shows the name and last 4 digits, so a typo doesn't send the bill to a stranger
 * (User Flows §2); without one, WhatsApp asks which chat.
 */
export function shareBillOnWhatsApp(
  bill: ShareableBill,
  customer: Customer | null,
  shop: Shop | null,
  onFail: (message: string) => void,
): void {
  const text = billShareText({
    shopName: shop?.name ?? 'Billify',
    billNumber: bill.number,
    totalPaise: bill.totalPaise,
    publicToken: bill.publicToken,
  });
  const open = () =>
    Linking.openURL(whatsAppLink(text, customer?.phone)).catch(() =>
      onFail('Couldn’t open WhatsApp. Is it installed on this phone?'),
    );
  if (!customer?.phone) {
    void open();
    return;
  }
  Alert.alert('Send bill?', `To ${customer.name}, ${maskPhone(customer.phone)}`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Send', onPress: () => void open() },
  ]);
}
