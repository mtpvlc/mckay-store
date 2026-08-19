'use server';

import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { config } from '@/lib/config';
import { walletKey } from '@/db/queries/settings';
import type { ActionResult } from '@/lib/validation';

/**
 * Deliberately loose: address formats differ per chain (0x..., bc1..., ENS
 * names). The admin is trusted here - the check only blocks whitespace and
 * markup, not "wrong-looking" addresses.
 */
const walletAddress = z
  .string()
  .trim()
  .max(200, 'That address looks too long')
  .regex(/^[\x21-\x7E]*$/, 'An address cannot contain spaces');

const notifyEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email('Enter a valid email address')
  .or(z.literal(''));

async function upsertOrClear(key: string, value: string): Promise<void> {
  if (value === '') {
    // Empty input resets the setting to its .env default.
    await db.delete(settings).where(eq(settings.key, key));
    return;
  }
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: sql`now()` },
    });
}

export async function updateStoreSettings(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const fieldErrors: Record<string, string[]> = {};

  const emailResult = notifyEmail.safeParse(String(formData.get('orderNotifyEmail') ?? ''));
  if (!emailResult.success) {
    fieldErrors.orderNotifyEmail = emailResult.error.issues.map((i) => i.message);
  }

  const wallets: { key: string; value: string }[] = [];
  for (const method of config.paymentMethods) {
    const raw = String(formData.get(`wallet_${method.id}`) ?? '');
    const result = walletAddress.safeParse(raw);
    if (!result.success) {
      fieldErrors[`wallet_${method.id}`] = result.error.issues.map((i) => i.message);
    } else {
      wallets.push({ key: walletKey(method.id), value: result.data });
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'Check the fields below.', fieldErrors };
  }

  await upsertOrClear('order_notify_email', emailResult.success ? emailResult.data : '');
  for (const wallet of wallets) {
    await upsertOrClear(wallet.key, wallet.value);
  }

  revalidatePath('/admin/settings');
  return { ok: true };
}
