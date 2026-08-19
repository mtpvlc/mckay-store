import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, and, gt, lt } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { db } from '@/db';
import { admins, adminSessions, customers, customerSessions } from '@/db/schema';
import { ADMIN_COOKIE_NAME, CUSTOMER_COOKIE_NAME, COOKIE_OPTIONS } from './cookies';

/**
 * Two separate auth systems. They share no lookup helper on purpose: a single
 * "is there a valid session" function is how a customer session ends up
 * satisfying an admin check.
 */

const ADMIN_TTL_MS = 12 * 60 * 60 * 1000; // 12h, absolute, never refreshed
const CUSTOMER_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d, sliding
const CUSTOMER_ABSOLUTE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90d, never extended

/** The cookie carries the raw token; the database stores only this hash. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Burns roughly the same time as a real verification so that a missing account
 * is not distinguishable from a wrong password by response timing.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$ZAiVtQe4YpZs0kZBCwXaJmKPvS6iVfMDNGFRt6bYm3g';

export async function burnPasswordTime(password: string): Promise<void> {
  try {
    await argon2.verify(DUMMY_HASH, password);
  } catch {
    /* expected - the point is the elapsed time, not the result */
  }
}

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/* ------------------------------------------------------------------ admin */

export type AdminSession = { adminId: string; email: string };

export async function createAdminSession(adminId: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + ADMIN_TTL_MS);

  await db.insert(adminSessions).values({ adminId, tokenHash: hashToken(token), expiresAt });

  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, { ...COOKIE_OPTIONS, expires: expiresAt });
}

/** Returns null instead of redirecting - for callers that need to branch. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  const rows = await db
    .select({ adminId: admins.id, email: admins.email })
    .from(adminSessions)
    .innerJoin(admins, eq(admins.id, adminSessions.adminId))
    .where(and(eq(adminSessions.tokenHash, hashToken(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Gate for admin pages and actions. Redirects rather than throwing: a thrown
 * error renders the error boundary, which is not a login page.
 *
 * redirect() signals by throwing NEXT_REDIRECT internally - never wrap a call
 * to this in try/catch that swallows unknown errors.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;

  // Delete the row first. Clearing the cookie alone leaves a live session that
  // still works for anyone holding the token.
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
  }
  store.delete(ADMIN_COOKIE_NAME);
}

/* --------------------------------------------------------------- customer */

export type CustomerSession = { customerId: string; email: string };

export async function createCustomerSession(customerId: string): Promise<void> {
  const token = newToken();
  const now = Date.now();
  const expiresAt = new Date(now + CUSTOMER_TTL_MS);
  const absoluteExpiresAt = new Date(now + CUSTOMER_ABSOLUTE_TTL_MS);

  await db.insert(customerSessions).values({
    customerId,
    tokenHash: hashToken(token),
    expiresAt,
    absoluteExpiresAt,
  });

  const store = await cookies();
  store.set(CUSTOMER_COOKIE_NAME, token, { ...COOKIE_OPTIONS, expires: absoluteExpiresAt });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const rows = await db
    .select({
      customerId: customers.id,
      email: customers.email,
      absoluteExpiresAt: customerSessions.absoluteExpiresAt,
    })
    .from(customerSessions)
    .innerJoin(customers, eq(customers.id, customerSessions.customerId))
    .where(
      and(
        eq(customerSessions.tokenHash, tokenHash),
        gt(customerSessions.expiresAt, now),
        gt(customerSessions.absoluteExpiresAt, now),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Sliding refresh, capped by absoluteExpiresAt which is never extended.
  const slid = new Date(Date.now() + CUSTOMER_TTL_MS);
  const nextExpiry = slid < row.absoluteExpiresAt ? slid : row.absoluteExpiresAt;
  await db
    .update(customerSessions)
    .set({ expiresAt: nextExpiry })
    .where(eq(customerSessions.tokenHash, tokenHash));

  return { customerId: row.customerId, email: row.email };
}

export async function requireCustomer(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect('/account');
  return session;
}

export async function destroyCustomerSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE_NAME)?.value;

  if (token) {
    await db.delete(customerSessions).where(eq(customerSessions.tokenHash, hashToken(token)));
  }
  store.delete(CUSTOMER_COOKIE_NAME);
}

/** Invalidates every other session for a customer, e.g. after a password change. */
export async function destroyOtherCustomerSessions(customerId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE_NAME)?.value;
  const keep = token ? hashToken(token) : '';

  const rows = await db
    .select({ tokenHash: customerSessions.tokenHash })
    .from(customerSessions)
    .where(eq(customerSessions.customerId, customerId));

  for (const row of rows) {
    if (row.tokenHash !== keep) {
      await db.delete(customerSessions).where(eq(customerSessions.tokenHash, row.tokenHash));
    }
  }
}

/** Opportunistic cleanup of expired rows. Safe to call from any request. */
export async function pruneExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
  await db.delete(customerSessions).where(lt(customerSessions.absoluteExpiresAt, now));
}
