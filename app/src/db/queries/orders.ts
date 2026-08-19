import 'server-only';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { orders, type Order } from '@/db/schema';
import type { OrderStatus } from '@/lib/validation';

export async function listAdminOrders(search?: string, status?: OrderStatus): Promise<Order[]> {
  const term = search?.trim();
  const filters = [];

  if (term) {
    filters.push(
      or(
        ilike(orders.reference, `%${term}%`),
        ilike(orders.email, `%${term}%`),
        ilike(orders.contactName, `%${term}%`),
      ),
    );
  }
  if (status) filters.push(eq(orders.status, status));

  return db
    .select()
    .from(orders)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(200);
}

export async function getAdminOrder(id: string): Promise<Order | null> {
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Customer-scoped. The customerId always comes from the session, never from a
 * request parameter.
 */
export async function listCustomerOrders(customerId: string): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(100);
}

export async function getOrderByReference(reference: string): Promise<Order | null> {
  const rows = await db.select().from(orders).where(eq(orders.reference, reference)).limit(1);
  return rows[0] ?? null;
}
