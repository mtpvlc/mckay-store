'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { products, priceHistory } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { storage, UploadError } from '@/lib/storage';
import { nextSlugCandidate, toSlug } from '@/lib/slug';
import { slugExists } from '@/db/queries/products';
import { productSchema, toFieldErrors, type ActionResult } from '@/lib/validation';

/** Every exported function here calls requireAdmin() on its first line. */

async function uniqueSlug(name: string, fallback: string, excludeId?: string): Promise<string> {
  const base = toSlug(name, fallback);
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = nextSlugCandidate(base, attempt);
    if (!(await slugExists(candidate, excludeId))) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function revalidateShop(slug?: string) {
  revalidatePath('/');
  revalidatePath('/admin/products');
  if (slug) revalidatePath(`/products/${slug}`);
}

async function uploadImages(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    if (file.size === 0) continue;
    const stored = await storage.put(file); // validates MIME type and size
    urls.push(stored.url);
  }
  return urls;
}

export async function createProduct(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    sortOrder: formData.get('sortOrder') ?? 0,
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  let images: string[] = [];
  try {
    images = await uploadImages(formData.getAll('images') as File[]);
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, error: error.message };
    throw error;
  }

  const id = crypto.randomUUID();
  const slug = await uniqueSlug(parsed.data.name, id);

  await db.transaction(async (tx) => {
    await tx.insert(products).values({
      id,
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceCents: parsed.data.price,
      stock: parsed.data.stock,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
      images,
    });

    await tx.insert(priceHistory).values({
      productId: id,
      oldPriceCents: null,
      newPriceCents: parsed.data.price,
    });
  });

  revalidateShop(slug);
  redirect(`/admin/products/${id}`);
}

export async function updateProduct(
  productId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    sortOrder: formData.get('sortOrder') ?? 0,
  });

  if (!parsed.success) {
    return { ok: false, error: 'Check the fields below.', fieldErrors: toFieldErrors(parsed.error) };
  }

  const existing = (
    await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .limit(1)
  )[0];

  if (!existing) return { ok: false, error: 'That product no longer exists.' };

  const keptImages = formData.getAll('existingImages').map(String).filter(Boolean);
  let newImages: string[] = [];
  try {
    newImages = await uploadImages(formData.getAll('images') as File[]);
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, error: error.message };
    throw error;
  }

  const images = [...keptImages, ...newImages];
  const removed = existing.images.filter((url) => !keptImages.includes(url));

  const slug =
    parsed.data.name === existing.name
      ? existing.slug
      : await uniqueSlug(parsed.data.name, existing.id, existing.id);

  const priceChanged = parsed.data.price !== existing.priceCents;

  // Product update and price history are one transaction: a partial failure
  // would leave a changed price with no record of the change.
  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        slug,
        name: parsed.data.name,
        description: parsed.data.description || null,
        priceCents: parsed.data.price,
        stock: parsed.data.stock,
        isActive: parsed.data.isActive,
        sortOrder: parsed.data.sortOrder,
        images,
      })
      .where(eq(products.id, productId));

    if (priceChanged) {
      await tx.insert(priceHistory).values({
        productId,
        oldPriceCents: existing.priceCents,
        newPriceCents: parsed.data.price,
      });
    }
  });

  // Only after the transaction commits - deleting first would orphan images
  // if the update rolled back.
  for (const url of removed) {
    await storage.delete(url.replace(/^\/uploads\//, ''));
  }

  revalidateShop(slug);
  if (slug !== existing.slug) revalidatePath(`/products/${existing.slug}`);

  return { ok: true };
}

export async function toggleProductActive(productId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();

  const rows = await db
    .update(products)
    .set({ isActive })
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .returning({ slug: products.slug });

  if (!rows[0]) return { ok: false, error: 'That product no longer exists.' };

  revalidateShop(rows[0].slug);
  return { ok: true };
}

export async function softDeleteProduct(productId: string): Promise<ActionResult> {
  await requireAdmin();

  // Soft delete only. There is no hard delete of a product anywhere.
  const rows = await db
    .update(products)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .returning({ slug: products.slug });

  if (!rows[0]) return { ok: false, error: 'That product no longer exists.' };

  revalidateShop(rows[0].slug);
  redirect('/admin/products');
}
