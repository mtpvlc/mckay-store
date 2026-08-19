'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { getCustomerByEmail, getCustomerById } from '@/db/queries/customers';
import {
  burnPasswordTime,
  createCustomerSession,
  destroyCustomerSession,
  destroyOtherCustomerSessions,
  hashPassword,
  requireCustomer,
  verifyPassword,
} from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request';
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  toFieldErrors,
  type ActionResult,
} from '@/lib/validation';

const GENERIC_LOGIN_ERROR = 'Those credentials are not valid.';

export async function registerCustomer(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  const ip = await getClientIp();
  const allowed = await checkRateLimit(
    `register:ip:${ip}`,
    RATE_LIMITS.registerByIp.limit,
    RATE_LIMITS.registerByIp.windowMs,
  );
  if (!allowed) return { ok: false, error: 'Too many attempts. Try again later.' };

  const existing = await getCustomerByEmail(parsed.data.email);
  if (existing) {
    // Same message the form shows on success would be better still, but an
    // account page cannot proceed without a session. Keep it non-specific.
    return { ok: false, error: 'That account could not be created.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const rows = await db
    .insert(customers)
    .values({
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name || null,
    })
    .returning({ id: customers.id });

  const created = rows[0];
  if (!created) return { ok: false, error: 'That account could not be created.' };

  await createCustomerSession(created.id);
  redirect('/account/orders');
}

export async function loginCustomer(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  const { email, password } = parsed.data;
  const ip = await getClientIp();

  const emailOk = await checkRateLimit(
    `customer-login:email:${email}`,
    RATE_LIMITS.loginByEmail.limit,
    RATE_LIMITS.loginByEmail.windowMs,
  );
  const ipOk = await checkRateLimit(
    `customer-login:ip:${ip}`,
    RATE_LIMITS.loginByIp.limit,
    RATE_LIMITS.loginByIp.windowMs,
  );
  if (!emailOk || !ipOk) return { ok: false, error: 'Too many attempts. Try again later.' };

  const customer = await getCustomerByEmail(email);

  if (!customer) {
    await burnPasswordTime(password);
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  if (!(await verifyPassword(customer.passwordHash, password))) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  await createCustomerSession(customer.id);
  redirect('/account/orders');
}

export async function logoutCustomer(): Promise<void> {
  await destroyCustomerSession();
  redirect('/account');
}

export async function updateProfile(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const session = await requireCustomer();

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    addressRaw: formData.get('addressRaw'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  await db
    .update(customers)
    .set({
      name: parsed.data.name || null,
      phone: parsed.data.phone || null,
      addressRaw: parsed.data.addressRaw || null,
    })
    .where(eq(customers.id, session.customerId));

  revalidatePath('/account/settings');
  return { ok: true };
}

export async function changePassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const session = await requireCustomer();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  const customer = await getCustomerById(session.customerId);
  if (!customer) return { ok: false, error: 'Your account could not be found.' };

  // Current password required. Email confirmation would be theatre while there
  // is no verified-email flow.
  if (!(await verifyPassword(customer.passwordHash, parsed.data.currentPassword))) {
    return { ok: false, error: 'Your current password is not correct.' };
  }

  await db
    .update(customers)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(customers.id, session.customerId));

  // Keep this session, kill every other one.
  await destroyOtherCustomerSessions(session.customerId);

  return { ok: true };
}
