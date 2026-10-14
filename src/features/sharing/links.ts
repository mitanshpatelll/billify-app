import { env } from '@/config/env';
import { formatRupees } from '@/lib/money';

/** Public bill page: same Expo route on the web, opens without sign-in. */
export function billUrl(publicToken: string): string {
  return `${env.webUrl}/b/${publicToken}`;
}

/** Free wa.me link from the shopkeeper's own WhatsApp. No phone = the shopkeeper picks a chat. */
export function whatsAppLink(text: string, phone?: string | null): string {
  const to = phone ? `91${phone}` : '';
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

type BillShare = {
  shopName: string;
  billNumber: string;
  totalPaise: number;
  publicToken: string;
};

export function billShareText({
  shopName,
  billNumber,
  totalPaise,
  publicToken,
}: BillShare): string {
  return `${shopName} bill ${billNumber} ${formatRupees(totalPaise)}\n${billUrl(publicToken)}`;
}
