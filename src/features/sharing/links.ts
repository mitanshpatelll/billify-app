import { env } from '@/config/env';
import { formatRupees } from '@/lib/money';
import { formatQty, type Unit } from '@/lib/units';

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

type ReorderLine = { name: string; qty: number; unit: Unit };

/** 14 Low stock → WhatsApp to the distributor: plain list, the shop's name on top. */
export function reorderText(shopName: string, lines: ReorderLine[]): string {
  const items = lines.map((line) => `• ${line.name}: ${formatQty(line.qty, line.unit)}`);
  return [`Order from ${shopName}`, ...items].join('\n');
}

type Reminder = { customerName: string; duePaise: number; shopName: string; upiId: string };

/** 15 Customer khata → WhatsApp: a polite reminder with the amount and how to pay. */
export function khataReminderText({ customerName, duePaise, shopName, upiId }: Reminder): string {
  return (
    `Namaste ${customerName}, ${formatRupees(duePaise)} is due at ${shopName}. ` +
    `You can pay at the shop, or by UPI to ${upiId}. Thank you!`
  );
}
