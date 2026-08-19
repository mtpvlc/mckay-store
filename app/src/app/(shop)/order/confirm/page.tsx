import Link from 'next/link';

export default async function OrderConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <div className="max-w-lg py-8">
      <h1 className="text-xl font-semibold">Order received</h1>
      <p className="mt-4 text-sm text-ink-muted">
        Thank you. A confirmation has been sent to the email address on the order.
      </p>
      {ref && (
        <p className="mt-6 rounded-card border border-line bg-surface-sunken px-4 py-3 text-sm">
          Your reference: <strong>{ref}</strong>
        </p>
      )}
      <p className="mt-6 text-sm text-ink-muted">
        We will be in touch with payment instructions shortly.
      </p>
      <Link href="/" className="mt-8 inline-block text-sm text-brand hover:underline">
        Back to all products
      </Link>
    </div>
  );
}
