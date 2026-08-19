import { requireAdmin } from '@/lib/auth';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <>
      <h1 className="mb-6 text-lg font-semibold">New product</h1>
      <ProductForm />
    </>
  );
}
