import Link from 'next/link';
import { Suspense } from 'react';
import { requireAdmin } from '@/lib/auth';
import { listAdminOrders } from '@/db/queries/orders';
import { SearchSort } from '@/components/admin/SearchSort';
import { formatPrice } from '@/lib/money';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/validation';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const status = ORDER_STATUSES.includes(params.sort as OrderStatus)
    ? (params.sort as OrderStatus)
    : undefined;

  const orders = await listAdminOrders(params.q, status);

  return (
    <>
      <h1 className="mb-6 text-lg font-semibold">Orders</h1>

      <Suspense>
        <SearchSort
          sorts={[
            { value: '', label: 'All statuses' },
            ...ORDER_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') })),
          ]}
        />
      </Suspense>

      {orders.length === 0 ? (
        <p className="text-sm text-ink-muted">No orders yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-4 font-medium">Reference</th>
              <th className="py-2 pr-4 font-medium">Customer</th>
              <th className="py-2 pr-4 font-medium">Total</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line/60">
                <td className="py-3 pr-4">
                  <Link href={`/admin/orders/${order.id}`} className="text-brand hover:underline">
                    {order.reference}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  {order.contactName}
                  <div className="text-xs text-ink-faint">{order.email}</div>
                </td>
                <td className="py-3 pr-4 tabular-nums">
                  {formatPrice(order.subtotalCents, order.currency)}
                </td>
                <td className="py-3 pr-4">{order.status.replace('_', ' ')}</td>
                <td className="py-3 text-ink-muted">{order.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
