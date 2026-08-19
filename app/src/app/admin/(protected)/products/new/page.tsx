import { requireAdmin } from '@/lib/auth';
import { listCategories } from '@/db/queries/categories';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function NewProductPage() {
  await requireAdmin();

  const categories = await listCategories();

  return (
    <>
      <h1 className="mb-6 text-lg font-semibold">New product</h1>
      <ProductForm categories={categories} />
    </>
  );
}
