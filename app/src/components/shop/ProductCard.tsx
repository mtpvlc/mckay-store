import Link from 'next/link';
import { formatPrice } from '@/lib/money';
import type { Product } from '@/db/schema';

/**
 * Layout ported from the static HTML: hatched image placeholder, name, muted
 * spec line, price and call to action. Every colour and radius comes from the
 * Tailwind theme - swap tokens in tailwind.config.ts, not here.
 */
export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const subtitle = product.description?.split('\n')[0] ?? '';

  return (
    <article className="flex flex-col border border-line bg-surface">
      <Link href={`/products/${product.slug}`} className="block">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="aspect-square w-full object-cover" />
        ) : (
          <div className="placeholder-hatch flex aspect-square w-full items-center justify-center border-b border-dashed border-line-strong">
            <span className="font-mono text-xs text-ink-faint">product shot needed</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="border-b border-line px-4 py-3">
          <Link href={`/products/${product.slug}`} className="text-lg hover:text-brand">
            {product.name}
          </Link>
          {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        </div>

        <div className="flex items-center justify-between border-b border-line px-4 py-3 text-sm">
          <span className="text-ink-muted">Stock</span>
          <span className="tabular-nums">{product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</span>
        </div>

        <div className="mt-auto flex items-end justify-between px-4 py-4">
          <div>
            <div className="text-xl text-brand">{formatPrice(product.priceCents, product.currency)}</div>
            <div className="text-xs text-ink-muted">per unit &middot; ex-works</div>
          </div>
          <Link
            href={`/products/${product.slug}`}
            className="rounded-card bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
