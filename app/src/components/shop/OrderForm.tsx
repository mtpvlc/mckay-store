'use client';

import { useActionState, useState } from 'react';
import { submitOrder } from '@/actions/orders';
import { HONEYPOT_FIELD } from '@/lib/honeypot';
import { formatPrice } from '@/lib/money';
import type { ActionResult } from '@/lib/validation';
import type { PaymentMethod } from '@/lib/config';

type CatalogueItem = { id: string; name: string; priceCents: number; currency: string; stock: number };

export function OrderForm({
  products,
  paymentMethods,
  initialProductId,
  prefill,
}: {
  products: CatalogueItem[];
  paymentMethods: PaymentMethod[];
  initialProductId?: string;
  prefill?: { contactName?: string; email?: string; phone?: string; addressRaw?: string };
}) {
  const [state, formAction] = useActionState<ActionResult<string> | null, FormData>(submitOrder, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const [quantities, setQuantities] = useState<Record<string, number>>(
    initialProductId ? { [initialProductId]: 1 } : {},
  );

  const items = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => ({ productId, qty }));

  const subtotal = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product ? product.priceCents * item.qty : 0);
  }, 0);

  const inputClass = 'w-full rounded-card border border-line px-3 py-2 text-sm outline-none focus:border-brand';

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      {state && !state.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {state.error}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Items</h2>
        <ul className="divide-y divide-line border-y border-line">
          {products.map((product) => (
            <li key={product.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm">{product.name}</div>
                <div className="text-xs text-ink-muted">
                  {formatPrice(product.priceCents, product.currency)} &middot;{' '}
                  {product.stock > 0 ? `${product.stock} available` : 'out of stock'}
                </div>
              </div>
              <input
                type="number"
                min={0}
                max={product.stock}
                disabled={product.stock === 0}
                value={quantities[product.id] ?? 0}
                onChange={(e) =>
                  setQuantities((current) => ({ ...current, [product.id]: Number(e.target.value) }))
                }
                className="w-20 rounded-card border border-line px-2 py-1 text-sm tabular-nums"
              />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-right text-sm font-semibold">Subtotal {formatPrice(subtotal)}</p>
        <input type="hidden" name="items" value={JSON.stringify(items)} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Order details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" name="contactName" errors={errors}>
            <input
              name="contactName"
              required
              placeholder="Full name"
              defaultValue={prefill?.contactName}
              className={inputClass}
            />
          </Field>
          <Field label="Email" name="email" errors={errors}>
            <input
              name="email"
              type="email"
              required
              placeholder="contact@company.com"
              defaultValue={prefill?.email}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4 sm:w-1/2 sm:pr-2">
          <Field label="Phone" name="phone" errors={errors}>
            <input
              name="phone"
              required
              placeholder="+1 234 567 8900"
              defaultValue={prefill?.phone}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Delivery address" name="addressRaw" errors={errors}>
            <textarea
              name="addressRaw"
              required
              rows={4}
              placeholder="Street address, city, country, postal code"
              defaultValue={prefill?.addressRaw}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-6">
          <Field label="Payment method" name="paymentMethodId" errors={errors}>
            <select name="paymentMethodId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Select a payment method
              </option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Notes (optional)" name="notes" errors={errors}>
            <textarea name="notes" rows={3} className={inputClass} />
          </Field>
        </div>
      </section>

      {/* Honeypot: hidden from people, tempting to bots. Never label it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={items.length === 0}
        className="rounded-card bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
      >
        Submit order
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: string;
  errors?: Record<string, string[]>;
  children: React.ReactNode;
}) {
  const message = errors?.[name]?.[0];
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-muted">{label}</span>
      {children}
      {message && <span className="mt-1 block text-xs text-danger">{message}</span>}
    </label>
  );
}
