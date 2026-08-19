'use client';

import { useActionState } from 'react';
import { loginAdmin } from '@/actions/auth';
import { Alert, Field, SubmitButton, inputClass } from '@/components/admin/ui';
import type { ActionResult } from '@/lib/validation';

export default function AdminLoginPage() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(loginAdmin, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-card">
        <h1 className="mb-6 text-lg font-semibold">Admin sign in</h1>

        {state && !state.ok && <Alert kind="error">{state.error}</Alert>}

        <form action={formAction} className="space-y-4">
          <Field label="Email" name="email" errors={errors}>
            <input type="email" name="email" required autoComplete="username" className={inputClass} />
          </Field>
          <Field label="Password" name="password" errors={errors}>
            <input type="password" name="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <SubmitButton>Sign in</SubmitButton>
        </form>
      </div>
    </div>
  );
}
