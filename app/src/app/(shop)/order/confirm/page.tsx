import Link from 'next/link';
import { getOrderByReference } from '@/db/queries/orders';
import { formatPrice } from '@/lib/money';

export default async function OrderConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const order = ref ? await getOrderByReference(ref) : null;

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
      {order?.payAddress ? (
        <div className="mt-6 rounded-card border border-line bg-surface-sunken px-4 py-4 text-sm">
          <p>
            Please send <strong>{formatPrice(order.subtotalCents, order.currency)}</strong>
            {order.paymentToken && order.paymentChain && (
              <> in {order.paymentToken} on {order.paymentChain}</>
            )}{' '}
            to:
          </p>
          <p className="mt-3 break-all rounded-card border border-line bg-surface px-3 py-2 font-mono text-xs font-semibold">
            {order.payAddress}
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            Include your order reference {order.reference} if the wallet supports a note. Your order
            will be marked paid once the payment is confirmed.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">
          We will be in touch with payment instructions shortly.
        </p>
      )}
      <Link href="/" className="mt-8 inline-block text-sm text-brand hover:underline">
        Back to all products
      </Link>
    </div>
  );
}
