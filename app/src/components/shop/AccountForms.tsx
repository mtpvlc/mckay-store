'use client';

import { useActionState, useState } from 'react';
import { loginCustomer, registerCustomer } from '@/actions/customers';
import type { ActionResult } from '@/lib/validation';

const inputClass = 'w-full rounded-card border border-line px-3 py-2 text-sm outline-none focus:border-brand';

export function AccountForms() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const action = mode === 'login' ? loginCustomer : registerCustomer;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <>
      <div className="mb-6 flex gap-6 border-b border-line text-sm">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`-mb-px border-b-2 pb-2 ${
              mode === m ? 'border-brand text-brand' : 'border-transparent text-ink-muted'
            }`}
          >
            {m === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {state && !state.ok && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4" key={mode}>
        {mode === 'register' && (
          <label className="block">
            <span className="mb-1 block text-sm text-ink-muted">Name (optional)</span>
            <input name="name" className={inputClass} />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Email</span>
          <input name="email" type="email" required autoComplete="username" className={inputClass} />
          {errors?.email?.[0] && <span className="mt-1 block text-xs text-danger">{errors.email[0]}</span>}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={inputClass}
          />
          {errors?.password?.[0] && (
            <span className="mt-1 block text-xs text-danger">{errors.password[0]}</span>
          )}
        </label>

        <button
          type="submit"
          className="rounded-card bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
        >
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </>
  );
}
