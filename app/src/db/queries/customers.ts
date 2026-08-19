import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { customers, type Customer } from '@/db/schema';

/** Email uniqueness is enforced on the lowercased value; callers must lowercase. */
export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const rows = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return rows[0] ?? null;
}
