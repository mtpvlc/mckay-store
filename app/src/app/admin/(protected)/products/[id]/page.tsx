import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getAdminProduct, getPriceHistory } from '@/db/queries/products';
import { listCategories } from '@/db/queries/categories';
import { ProductForm } from '@/components/admin/ProductForm';
import { softDeleteProduct } from '@/actions/products';
import { formatPrice } from '@/lib/money';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  const product = await getAdminProduct(id);
  if (!product) notFound();

  const history = await getPriceHistory(id);
  const categories = await listCategories();

  async function remove() {
    'use server';
    await softDeleteProduct(id);
  }

  return (
    <>
      <h1 className="mb-6 text-lg font-semibold">{product.name}</h1>

      <ProductForm product={product} categories={categories} />

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold">Price history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">No changes recorded.</p>
        ) : (
          <table className="w-full max-w-lg border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">From</th>
                <th className="py-2 font-medium">To</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-b border-line/60">
                  <td className="py-2 pr-4 text-ink-muted">{row.changedAt.toLocaleString()}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {row.oldPriceCents === null ? '-' : formatPrice(row.oldPriceCents)}
                  </td>
                  <td className="py-2 tabular-nums">{formatPrice(row.newPriceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <form action={remove}>
          <button type="submit" className="text-sm text-danger hover:underline">
            Delete this product
          </button>
        </form>
        <p className="mt-1 text-xs text-ink-faint">
          Hidden from the shop and the admin list. The record and its order history are kept.
        </p>
      </section>
    </>
  );
}
