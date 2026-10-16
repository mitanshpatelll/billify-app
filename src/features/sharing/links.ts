import { env } from '@/config/env';
import { formatRupees } from '@/lib/money';
import { formatQty, type Unit } from '@/lib/units';

/** Public bill page: same Expo route on the web, opens without sign-in. */
export function billUrl(publicToken: string): string {
  return `${env.webUrl}/b/${publicToken}`;
}

/** Khata page (D27): what's due, Pay by UPI, I've paid. No sign-in. */
export function khataPageUrl(khataToken: string): string {
  return `${env.webUrl}/k/${khataToken}`;
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

/**
 * 14 Low stock → WhatsApp to the distributor: plain list, the shop's name on top, one quiet
 * "Made with Billify" line at the end (D27: one distributor serves hundreds of kiranas).
 */
export function reorderText(shopName: string, lines: ReorderLine[]): string {
  const items = lines.map((line) => `• ${line.name}: ${formatQty(line.qty, line.unit)}`);
  return [`Order from ${shopName}`, ...items, '', `Made with Billify · ${env.webUrl}`].join('\n');
}

type Reminder = {
  customerName: string;
  duePaise: number;
  shopName: string;
  upiId: string;
  /** The khata page token: the link to pay by UPI or say "I've paid" (D27). */
  khataToken?: string | null;
};

/** 15 Customer khata → WhatsApp: a polite reminder with the amount and how to pay. */
export function khataReminderText({
  customerName,
  duePaise,
  shopName,
  upiId,
  khataToken,
}: Reminder): string {
  const text =
    `Namaste ${customerName}, ${formatRupees(duePaise)} is due at ${shopName}. ` +
    `You can pay at the shop, or by UPI to ${upiId}. Thank you!`;
  return khataToken ? `${text}\nPay or tell us you paid: ${khataPageUrl(khataToken)}` : text;
}
