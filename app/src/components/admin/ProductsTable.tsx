'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { toggleProductActive } from '@/actions/products';
import { formatPrice } from '@/lib/money';
import type { Product } from '@/db/schema';

export function ProductsTable({ products }: { products: Product[] }) {
  const [pending, startTransition] = useTransition();

  if (products.length === 0) {
    return <p className="text-sm text-ink-muted">No products yet.</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
          <th className="py-2 pr-4 font-medium">Name</th>
          <th className="py-2 pr-4 font-medium">Price</th>
          <th className="py-2 pr-4 font-medium">Stock</th>
          <th className="py-2 pr-4 font-medium">Active</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id} className="border-b border-line/60">
            <td className="py-3 pr-4">
              <Link href={`/admin/products/${product.id}`} className="text-brand hover:underline">
                {product.name}
              </Link>
              <div className="text-xs text-ink-faint">/{product.slug}</div>
            </td>
            <td className="py-3 pr-4 tabular-nums">{formatPrice(product.priceCents, product.currency)}</td>
            <td className="py-3 pr-4 tabular-nums">{product.stock}</td>
            <td className="py-3 pr-4">
              <input
                type="checkbox"
                checked={product.isActive}
                disabled={pending}
                onChange={(event) => {
                  const next = event.target.checked;
                  startTransition(() => {
                    void toggleProductActive(product.id, next);
                  });
                }}
                className="h-4 w-4 accent-brand"
              />
            </td>
            <td className="py-3 text-right">
              <Link href={`/admin/products/${product.id}`} className="text-xs text-ink-muted hover:text-brand">
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
