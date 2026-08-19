import Link from 'next/link';
import { getCustomerSession } from '@/lib/auth';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await getCustomerSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold">Shop</Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/order" className="text-ink-muted hover:text-brand">Order</Link>
            {session ? (
              <Link href="/account/orders" className="text-ink-muted hover:text-brand">My orders</Link>
            ) : (
              <Link href="/account" className="text-ink-muted hover:text-brand">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
