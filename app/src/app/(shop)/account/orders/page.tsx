import Link from 'next/link';
import { requireCustomer } from '@/lib/auth';
import { listCustomerOrders } from '@/db/queries/orders';
import { logoutCustomer } from '@/actions/customers';
import { formatPrice } from '@/lib/money';

export default async function MyOrdersPage() {
  // Scoped by the session's customerId - never by a request parameter.
  const session = await requireCustomer();
  const orders = await listCustomerOrders(session.customerId);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">My orders</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/account/settings" className="text-ink-muted hover:text-brand">Settings</Link>
          <form action={logoutCustomer}>
            <button type="submit" className="text-ink-muted hover:text-danger">Sign out</button>
          </form>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-ink-muted">You have not placed any orders yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between py-4">
              <div>
                <div className="text-sm font-medium">{order.reference}</div>
                <div className="text-xs text-ink-muted">
                  {order.createdAt.toLocaleDateString()} &middot; {order.lineItems.length} item(s)
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm tabular-nums">
                  {formatPrice(order.subtotalCents, order.currency)}
                </div>
                <div className="text-xs text-ink-muted">{order.status.replace('_', ' ')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
