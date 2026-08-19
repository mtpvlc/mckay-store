'use client';

import { useActionState, useState, useTransition } from 'react';
import { createCategory, deleteCategory, renameCategory } from '@/actions/categories';
import type { ActionResult } from '@/lib/validation';
import { Alert, SubmitButton, inputClass } from './ui';

type Row = { id: string; name: string; slug: string; productCount: number };

export function CategoriesManager({ rows }: { rows: Row[] }) {
  const [createState, createAction] = useActionState<ActionResult | null, FormData>(
    createCategory,
    null,
  );

  return (
    <div className="max-w-2xl space-y-8">
      <form action={createAction} className="flex items-end gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-sm text-ink-muted">New category</span>
          <input name="name" required placeholder="e.g. Protein" className={inputClass} />
        </label>
        <SubmitButton>Add</SubmitButton>
      </form>
      {createState && !createState.ok && <Alert kind="error">{createState.error}</Alert>}

      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No categories yet. Products can exist without one.</p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {rows.map((row) => (
            <CategoryRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({ row }: { row: Row }) {
  const [editing, setEditing] = useState(false);
  const [state, renameAction] = useActionState<ActionResult | null, FormData>(
    renameCategory.bind(null, row.id),
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <li className="px-4 py-3">
      {editing ? (
        <form action={renameAction} className="flex items-center gap-3">
          <input name="name" defaultValue={row.name} required autoFocus className={inputClass} />
          <SubmitButton>Save</SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium">{row.name}</span>
            <span className="ml-3 text-xs text-ink-faint">
              {row.productCount} {row.productCount === 1 ? 'product' : 'products'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-ink-muted hover:text-brand"
            >
              Rename
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const label =
                  row.productCount > 0
                    ? `Delete "${row.name}"? Its ${row.productCount} product(s) will become uncategorised.`
                    : `Delete "${row.name}"?`;
                if (!window.confirm(label)) return;
                startTransition(async () => {
                  const result = await deleteCategory(row.id);
                  setDeleteError(result.ok ? null : result.error);
                });
              }}
              className="text-ink-muted hover:text-danger disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {state && !state.ok && <p className="mt-2 text-xs text-danger">{state.error}</p>}
      {deleteError && <p className="mt-2 text-xs text-danger">{deleteError}</p>}
    </li>
  );
}
