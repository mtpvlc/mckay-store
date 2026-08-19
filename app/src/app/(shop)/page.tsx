import { listPublicProducts } from '@/db/queries/products';
import { ProductCard } from '@/components/shop/ProductCard';

export const revalidate = 60;

export default async function CataloguePage() {
  const products = await listPublicProducts();

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">Products</h1>
      {products.length === 0 ? (
        <p className="text-sm text-ink-muted">Nothing listed yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
