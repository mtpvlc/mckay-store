import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { logoutAdmin } from '@/actions/auth';

/**
 * Route group (protected) so that /admin/login sits OUTSIDE this gate. A
 * nested layout would not override this one - the login page would inherit
 * requireAdmin() and redirect to itself forever.
 *
 * This is a convenience gate only. Every page and action underneath calls
 * requireAdmin() itself, because a layout check does not protect a server
 * action invoked directly.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-surface-sunken">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-6 text-sm">
            <span className="font-semibold">Admin</span>
            <Link href="/admin/products" className="text-ink-muted hover:text-brand">Products</Link>
            <Link href="/admin/orders" className="text-ink-muted hover:text-brand">Orders</Link>
            <Link href="/admin/settings" className="text-ink-muted hover:text-brand">Settings</Link>
          </nav>
          <form action={logoutAdmin} className="flex items-center gap-4">
            <span className="text-xs text-ink-faint">{session.email}</span>
            <button type="submit" className="text-sm text-ink-muted hover:text-danger">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
