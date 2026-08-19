import { listPublicProducts } from '@/db/queries/products';
import { ProductCard } from '@/components/shop/ProductCard';

// Rendered per request: the database is not reachable at build time on the
// build host, and a live read keeps new products visible immediately.
export const dynamic = 'force-dynamic';

export default async function CataloguePage() {
  const products = await listPublicProducts();

  return (
    <>
      <section className="grid items-center gap-10 py-8 md:grid-cols-2 md:py-16">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Direct from the manufacturer, pack by pack
          </h1>
          <p className="mt-5 max-w-md text-ink-muted">
            McKay Shop offers premium supplements, specially designed to meet the needs of high
            performance individuals!
          </p>
          <a
            href="#products"
            className="mt-8 inline-block rounded-card bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-hover"
          >
            See all product lines
          </a>
        </div>
        <div className="flex justify-center md:justify-end md:pr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mckay-logo.png" alt="McKay Shop logo" className="w-56 object-contain sm:w-72 md:w-80" />
        </div>
      </section>

      <section id="products" className="scroll-mt-8 pb-8">
        <h2 className="mb-6 text-xl font-semibold">Products</h2>
        {products.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing listed yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
