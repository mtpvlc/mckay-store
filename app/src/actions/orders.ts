'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { orders, type LineItem } from '@/db/schema';
import { getActiveProductsByIds } from '@/db/queries/products';
import { getOrderNotifyEmail, getWalletAddress } from '@/db/queries/settings';
import { requireAdmin, getCustomerSession } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request';
import { isBotSubmission } from '@/lib/honeypot';
import { config } from '@/lib/config';
import { sendQuietly } from '@/lib/mail/smtp';
import { orderConfirmationCustomer, orderNotificationInternal } from '@/lib/mail/templates';
import {
  orderAdminUpdateSchema,
  orderFormSchema,
  toFieldErrors,
  type ActionResult,
} from '@/lib/validation';

function referenceFor(date: Date, sequence: number): string {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${stamp}-${String(sequence).padStart(4, '0')}`;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export async function submitOrder(_prev: unknown, formData: FormData): Promise<ActionResult<string>> {
  // 1. Honeypot. Silent success - never tell a bot it was caught.
  if (isBotSubmission(formData)) {
    return { ok: true, data: 'ORD-PENDING' };
  }

  // 2. Rate limit by IP.
  const ip = await getClientIp();
  const allowed = await checkRateLimit(
    `order:ip:${ip}`,
    RATE_LIMITS.orderByIp.limit,
    RATE_LIMITS.orderByIp.windowMs,
  );
  if (!allowed) return { ok: false, error: 'Too many orders from this connection. Try again later.' };

  // 3. Validate.
  let items: { productId: string; qty: number }[] = [];
  try {
    items = JSON.parse(String(formData.get('items') ?? '[]'));
  } catch {
    return { ok: false, error: 'Your order could not be read. Please try again.' };
  }

  const parsed = orderFormSchema.safeParse({
    contactName: formData.get('contactName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    addressRaw: formData.get('addressRaw'),
    paymentMethodId: formData.get('paymentMethodId'),
    notes: formData.get('notes'),
    items,
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  const method = config.paymentMethods.find((m) => m.id === parsed.data.paymentMethodId);
  if (!method) return { ok: false, error: 'Select a valid payment method.' };

  // 4. Re-fetch every product. Prices come from the database, never the client.
  const ids = [...new Set(parsed.data.items.map((i) => i.productId))];
  const found = await getActiveProductsByIds(ids);
  if (found.length !== ids.length) {
    return { ok: false, error: 'One of those products is no longer available.' };
  }

  const byId = new Map(found.map((p) => [p.id, p]));

  // 5. Check stock. Availability only - stock is not decremented until a
  // payment confirms, otherwise abandoned orders silently consume inventory.
  for (const item of parsed.data.items) {
    const product = byId.get(item.productId)!;
    if (product.stock < item.qty) {
      return { ok: false, error: `${product.name} does not have enough stock.` };
    }
  }

  // 6. Snapshot name and price at order time.
  const lineItems: LineItem[] = parsed.data.items.map((item) => {
    const product = byId.get(item.productId)!;
    return {
      productId: product.id,
      nameSnapshot: product.name,
      unitPriceCents: product.priceCents,
      qty: item.qty,
    };
  });

  // 7. Server-side total.
  const subtotalCents = lineItems.reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0);

  // 9. Attach the customer if signed in. Guest checkout stays supported.
  const session = await getCustomerSession();

  // Snapshot the receive address at order time - changing it in settings later
  // must not change where an already-placed order says to pay.
  const payAddress = await getWalletAddress(method.id);

  // 8. Insert with a retry loop - generating the reference up front and hoping
  // for no collision fails under concurrency.
  const now = new Date();
  let reference = '';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = referenceFor(now, Math.floor(Math.random() * 9000) + 1000);
    try {
      await db.insert(orders).values({
        reference: candidate,
        customerId: session?.customerId ?? null,
        contactName: parsed.data.contactName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        addressRaw: parsed.data.addressRaw,
        notes: parsed.data.notes || null,
        currency: config.storeCurrency,
        lineItems,
        subtotalCents,
        paymentChain: method.chain,
        paymentToken: method.token,
        payAddress,
      });
      reference = candidate;
      break;
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 4) continue;
      throw error;
    }
  }

  if (!reference) return { ok: false, error: 'Could not place the order. Please try again.' };

  // 10. Both sends are non-blocking; neither failure rolls back the order.
  const mailData = {
    reference,
    contactName: parsed.data.contactName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    addressRaw: parsed.data.addressRaw,
    notes: parsed.data.notes || null,
    status: 'new',
    paymentMethodLabel: method.label,
    payAddress,
    lineItems,
    subtotalCents,
    currency: config.storeCurrency,
  };

  const notifyTo = await getOrderNotifyEmail();
  await sendQuietly({ ...orderNotificationInternal(mailData), to: notifyTo });
  await sendQuietly(orderConfirmationCustomer(mailData));

  revalidatePath('/admin/orders');

  // 11. Redirect to the confirmation page. Outside try/catch by necessity.
  redirect(`/order/confirm?ref=${encodeURIComponent(reference)}`);
}

export async function updateOrderStatus(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = orderAdminUpdateSchema.safeParse({
    orderId: formData.get('orderId'),
    status: formData.get('status'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  await db
    .update(orders)
    .set({ status: parsed.data.status, notes: parsed.data.notes || null })
    .where(eq(orders.id, parsed.data.orderId));

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true };
}
