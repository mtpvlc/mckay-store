import 'server-only';
import { eq, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { rateLimits } from '@/db/schema';

/**
 * Fixed-window counter backed by the database, so it survives restarts and
 * works across serverless instances.
 *
 * Callers must treat a false return as a generic failure: never surface the
 * counter, the limit, or the reset time to the client.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();

  // Lazy cleanup - a standalone cron script tends never to get scheduled.
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, now));

  const resetAt = new Date(now.getTime() + windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

  if (!row) return false;
  return row.count <= limit;
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}

export const RATE_LIMITS = {
  loginByEmail: { limit: 5, windowMs: 15 * 60 * 1000 },
  loginByIp: { limit: 20, windowMs: 15 * 60 * 1000 },
  registerByIp: { limit: 3, windowMs: 60 * 60 * 1000 },
  orderByIp: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;
