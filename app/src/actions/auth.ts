'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { admins } from '@/db/schema';
import {
  burnPasswordTime,
  createAdminSession,
  destroyAdminSession,
  verifyPassword,
} from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request';
import { loginSchema, toFieldErrors, type ActionResult } from '@/lib/validation';

/** Identical message for wrong password and unknown account. */
const GENERIC_LOGIN_ERROR = 'Those credentials are not valid.';

export async function loginAdmin(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  const { email, password } = parsed.data;
  const ip = await getClientIp();

  // Both counters must pass. The email counter stops credential stuffing
  // against one account; the IP counter stops spraying across many.
  const emailOk = await checkRateLimit(
    `admin-login:email:${email}`,
    RATE_LIMITS.loginByEmail.limit,
    RATE_LIMITS.loginByEmail.windowMs,
  );
  const ipOk = await checkRateLimit(
    `admin-login:ip:${ip}`,
    RATE_LIMITS.loginByIp.limit,
    RATE_LIMITS.loginByIp.windowMs,
  );

  if (!emailOk || !ipOk) {
    // Never reveal which counter tripped or when it resets.
    return { ok: false, error: 'Too many attempts. Try again later.' };
  }

  const rows = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  const admin = rows[0];

  if (!admin) {
    // Spend comparable time so a missing account is not detectable by timing.
    await burnPasswordTime(password);
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  if (!(await verifyPassword(admin.passwordHash, password))) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  await createAdminSession(admin.id);

  // Outside any try/catch: redirect() signals by throwing NEXT_REDIRECT.
  redirect('/admin/products');
}

export async function logoutAdmin(): Promise<void> {
  // Deletes the admin_sessions row, not just the cookie. A cleared cookie with
  // a live row leaves a token that still works.
  await destroyAdminSession();
  redirect('/admin/login');
}
