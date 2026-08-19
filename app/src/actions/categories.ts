'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { nextSlugCandidate, toSlug } from '@/lib/slug';
import { categoryNameExists, getCategoryBySlug } from '@/db/queries/categories';
import type { ActionResult } from '@/lib/validation';

const nameSchema = z.string().trim().min(1, 'Name is required').max(100);

function revalidateCategories() {
  revalidatePath('/admin/categories');
  revalidatePath('/admin/products');
  revalidatePath('/');
}

async function uniqueCategorySlug(name: string, fallback: string): Promise<string> {
  const base = toSlug(name, fallback);
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = nextSlugCandidate(base, attempt);
    if (!(await getCategoryBySlug(candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function createCategory(_prev: unknown, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = nameSchema.safeParse(formData.get('name'));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid name' };
  }

  if (await categoryNameExists(parsed.data)) {
    return { ok: false, error: 'A category with that name already exists.' };
  }

  const id = crypto.randomUUID();
  const slug = await uniqueCategorySlug(parsed.data, id);
  await db.insert(categories).values({ id, slug, name: parsed.data });

  revalidateCategories();
  return { ok: true };
}

export async function renameCategory(
  categoryId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = nameSchema.safeParse(formData.get('name'));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid name' };
  }

  if (await categoryNameExists(parsed.data, categoryId)) {
    return { ok: false, error: 'A category with that name already exists.' };
  }

  // The slug is kept stable on rename so links and filters keep working.
  const rows = await db
    .update(categories)
    .set({ name: parsed.data })
    .where(eq(categories.id, categoryId))
    .returning({ id: categories.id });

  if (!rows[0]) return { ok: false, error: 'That category no longer exists.' };

  revalidateCategories();
  return { ok: true };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  await requireAdmin();

  // products.category_id is ON DELETE SET NULL: products in this category
  // become uncategorised, never deleted.
  const rows = await db
    .delete(categories)
    .where(eq(categories.id, categoryId))
    .returning({ id: categories.id });

  if (!rows[0]) return { ok: false, error: 'That category no longer exists.' };

  revalidateCategories();
  return { ok: true };
}
