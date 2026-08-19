import 'server-only';
import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { products, priceHistory, type Product } from '@/db/schema';

/**
 * Every read filters `deleted_at IS NULL`. Products are only ever soft
 * deleted - there is no hard delete anywhere in this file.
 */
const notDeleted = isNull(products.deletedAt);

export async function listPublicProducts(): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(and(notDeleted, eq(products.isActive, true)))
    .orderBy(asc(products.sortOrder), asc(products.name));
}

export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  const rows = await db
    .select()
    .from(products)
    .where(and(notDeleted, eq(products.isActive, true), eq(products.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPublicSlugs(): Promise<{ slug: string }[]> {
  return db
    .select({ slug: products.slug })
    .from(products)
    .where(and(notDeleted, eq(products.isActive, true)));
}

export type AdminProductSort = 'name' | 'price' | 'stock' | 'updated';

export async function listAdminProducts(
  search?: string,
  sort: AdminProductSort = 'updated',
): Promise<Product[]> {
  const term = search?.trim();
  const where = term
    ? and(notDeleted, or(ilike(products.name, `%${term}%`), ilike(products.slug, `%${term}%`)))
    : notDeleted;

  const order = {
    name: asc(products.name),
    price: asc(products.priceCents),
    stock: asc(products.stock),
    updated: desc(products.updatedAt),
  }[sort];

  return db.select().from(products).where(where).orderBy(order);
}

export async function getAdminProduct(id: string): Promise<Product | null> {
  const rows = await db
    .select()
    .from(products)
    .where(and(notDeleted, eq(products.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** Fetches by id for order submission - the server-side source of truth for price. */
export async function getActiveProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(products)
    .where(and(notDeleted, eq(products.isActive, true), sql`${products.id} = ANY(${ids})`));
}

export async function getPriceHistory(productId: string) {
  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, productId))
    .orderBy(desc(priceHistory.changedAt))
    .limit(50);
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  const found = rows[0];
  if (!found) return false;
  return excludeId ? found.id !== excludeId : true;
}
