import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProductBySlug, listPublicSlugs } from '@/db/queries/products';
import { formatPrice } from '@/lib/money';

export const revalidate = 60;

export async function generateStaticParams() {
  return listPublicSlugs();
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) notFound();

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div>
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} className="w-full border border-line object-cover" />
        ) : (
          <div className="placeholder-hatch flex aspect-square w-full items-center justify-center border border-line">
            <span className="font-mono text-xs text-ink-faint">product shot needed</span>
          </div>
        )}
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-3">
            {product.images.slice(1).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-20 w-20 border border-line object-cover" />
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        {product.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-ink-muted">{product.description}</p>
        )}

        <p className="mt-6 text-2xl text-brand">{formatPrice(product.priceCents, product.currency)}</p>
        <p className="text-xs text-ink-muted">per unit &middot; ex-works</p>

        <p className="mt-4 text-sm text-ink-muted">
          {product.stock > 0 ? `${product.stock} available` : 'Currently out of stock'}
        </p>

        {product.stock > 0 && (
          <Link
            href={`/order?product=${product.id}`}
            className="mt-6 inline-block rounded-card bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
          >
            Order this
          </Link>
        )}
      </div>
    </article>
  );
}
