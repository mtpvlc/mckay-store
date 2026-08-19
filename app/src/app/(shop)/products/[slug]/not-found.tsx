import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold">Product not found</h1>
      <p className="mt-2 text-sm text-ink-muted">It may have been removed or renamed.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-brand hover:underline">
        Back to all products
      </Link>
    </div>
  );
}
