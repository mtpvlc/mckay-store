import Link from 'next/link';
import { Suspense } from 'react';
import { requireAdmin } from '@/lib/auth';
import { listAdminProducts, type AdminProductSort } from '@/db/queries/products';
import { ProductsTable } from '@/components/admin/ProductsTable';
import { SearchSort } from '@/components/admin/SearchSort';

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const sort = (['name', 'price', 'stock', 'updated'] as const).includes(params.sort as AdminProductSort)
    ? (params.sort as AdminProductSort)
    : 'updated';

  const products = await listAdminProducts(params.q, sort);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-card bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          New product
        </Link>
      </div>

      <Suspense>
        <SearchSort
          sorts={[
            { value: 'updated', label: 'Recently updated' },
            { value: 'name', label: 'Name' },
            { value: 'price', label: 'Price' },
            { value: 'stock', label: 'Stock' },
          ]}
        />
      </Suspense>

      <ProductsTable products={products} />
    </>
  );
}
