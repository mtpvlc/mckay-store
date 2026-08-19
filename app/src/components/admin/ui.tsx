'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, variant = 'primary' }: { children: React.ReactNode; variant?: 'primary' | 'danger' }) {
  const { pending } = useFormStatus();
  const base = 'rounded-card px-4 py-2 text-sm font-semibold text-white disabled:opacity-60';
  const colour = variant === 'danger' ? 'bg-danger hover:opacity-90' : 'bg-brand hover:bg-brand-hover';
  return (
    <button type="submit" disabled={pending} className={`${base} ${colour}`}>
      {pending ? 'Working...' : children}
    </button>
  );
}

export function Field({
  label,
  name,
  errors,
  children,
  hint,
}: {
  label: string;
  name: string;
  errors?: Record<string, string[]>;
  children: React.ReactNode;
  hint?: string;
}) {
  const message = errors?.[name]?.[0];
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-muted">{label}</span>
      {children}
      {hint && !message && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
      {message && <span className="mt-1 block text-xs text-danger">{message}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-card border border-line px-3 py-2 text-sm outline-none focus:border-brand';

export function Alert({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  const style = kind === 'error' ? 'border-danger/30 bg-danger/5 text-danger' : 'border-success/30 bg-success/5 text-success';
  return <div className={`mb-4 rounded-card border px-3 py-2 text-sm ${style}`}>{children}</div>;
}
