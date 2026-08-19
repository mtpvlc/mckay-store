import { requireAdmin } from '@/lib/auth';
import { listCategoriesWithCounts } from '@/db/queries/categories';
import { CategoriesManager } from '@/components/admin/CategoriesManager';

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const rows = await listCategoriesWithCounts();

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Categories</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Deleting a category never deletes its products - they just become uncategorised.
      </p>
      <CategoriesManager rows={rows} />
    </div>
  );
}
