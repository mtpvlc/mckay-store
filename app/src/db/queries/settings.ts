import 'server-only';
import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { config } from '@/lib/config';

/**
 * Admin-editable settings, stored as key-value rows. A missing row means
 * "use the .env default" - deleting a row is how a setting is reset.
 *
 * Keys in use:
 *   wallet:<paymentMethodId>   receive address shown to customers for that method
 *   order_notify_email         where new-order notifications are sent
 */

export async function getSettings(keys: string[]): Promise<Map<string, string>> {
  if (keys.length === 0) return new Map();
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys));
  return new Map(rows.map((r) => [r.key, r.value]));
}

export function walletKey(paymentMethodId: string): string {
  return `wallet:${paymentMethodId}`;
}

/** Receive address for a payment method, or null if the admin has not set one. */
export async function getWalletAddress(paymentMethodId: string): Promise<string | null> {
  const map = await getSettings([walletKey(paymentMethodId)]);
  return map.get(walletKey(paymentMethodId)) ?? null;
}

/** Where new-order notifications go. Falls back to ORDER_NOTIFY_EMAIL from .env. */
export async function getOrderNotifyEmail(): Promise<string> {
  const map = await getSettings(['order_notify_email']);
  return map.get('order_notify_email') ?? config.orderNotifyEmail;
}
