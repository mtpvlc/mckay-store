'use client';

import { useActionState, useState } from 'react';
import { createProduct, updateProduct } from '@/actions/products';
import { centsToInput } from '@/lib/money';
import { Alert, Field, SubmitButton, inputClass } from './ui';
import type { Product } from '@/db/schema';
import type { ActionResult } from '@/lib/validation';

export function ProductForm({ product }: { product?: Product }) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state && !state.ok && <Alert kind="error">{state.error}</Alert>}
      {state?.ok && <Alert kind="success">Saved.</Alert>}

      <Field label="Name" name="name" errors={errors}>
        <input name="name" required defaultValue={product?.name} className={inputClass} />
      </Field>

      <Field label="Description" name="description" errors={errors}>
        <textarea
          name="description"
          rows={5}
          defaultValue={product?.description ?? ''}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Price" name="price" errors={errors} hint="e.g. 49.99 or 49,99">
          <input
            name="price"
            required
            inputMode="decimal"
            defaultValue={product ? centsToInput(product.priceCents) : ''}
            className={inputClass}
          />
        </Field>
        <Field label="Stock" name="stock" errors={errors}>
          <input
            name="stock"
            type="number"
            min={0}
            required
            defaultValue={product?.stock ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Sort order" name="sortOrder" errors={errors}>
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={product?.sortOrder ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={product?.isActive ?? true}
          className="h-4 w-4 accent-brand"
        />
        Visible in the shop
      </label>

      <div>
        <span className="mb-2 block text-sm text-ink-muted">Images</span>

        {images.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-3">
            {images.map((url, index) => (
              <li
                key={url}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) move(dragIndex, index);
                  setDragIndex(null);
                }}
                className="relative cursor-move rounded-card border border-line p-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-24 w-24 object-cover" />
                <input type="hidden" name="existingImages" value={url} />
                <button
                  type="button"
                  onClick={() => setImages((c) => c.filter((u) => u !== url))}
                  className="absolute right-1 top-1 rounded bg-white/90 px-1 text-xs text-danger"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <input
          type="file"
          name="images"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="text-sm"
        />
        <p className="mt-1 text-xs text-ink-faint">
          JPEG, PNG, WebP or AVIF, up to 8 MB each. Drag thumbnails to reorder.
        </p>
      </div>

      <SubmitButton>{product ? 'Save changes' : 'Create product'}</SubmitButton>
    </form>
  );
}
