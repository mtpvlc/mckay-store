import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getAdminOrder } from '@/db/queries/orders';
import { OrderStatusForm } from '@/components/admin/OrderStatusForm';
import { formatPrice } from '@/lib/money';

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <>
      <h1 className="mb-6 text-lg font-semibold">{order.reference}</h1>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Customer-submitted fields are read-only. */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">Customer</h2>
          <dl className="space-y-1 text-sm">
            <Row label="Name" value={order.contactName} />
            <Row label="Email" value={order.email} />
            <Row label="Phone" value={order.phone} />
            <Row label="Address" value={order.addressRaw} />
            <Row label="Payment" value={[order.paymentToken, order.paymentChain].filter(Boolean).join(' on ') || '-'} />
            <Row label="Account" value={order.customerId ? 'Registered' : 'Guest'} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Items</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {order.lineItems.map((item, index) => (
                <tr key={`${item.productId}-${index}`} className="border-b border-line/60">
                  <td className="py-2 pr-4">{item.nameSnapshot}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{item.qty}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatPrice(item.unitPriceCents * item.qty, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm font-semibold">
            Total {formatPrice(order.subtotalCents, order.currency)}
          </p>
        </section>
      </div>

      <section className="mt-10 max-w-md border-t border-line pt-6">
        <h2 className="mb-3 text-sm font-semibold">Internal</h2>
        <OrderStatusForm orderId={order.id} status={order.status} notes={order.notes ?? ''} />
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-ink-faint">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
