'use client';

import { useActionState } from 'react';
import { updateStoreSettings } from '@/actions/settings';
import type { ActionResult } from '@/lib/validation';
import { Alert, Field, SubmitButton, inputClass } from './ui';

type MethodField = { id: string; label: string; chain: string; token: string; address: string };

export function StoreSettingsForm({
  methods,
  orderNotifyEmail,
  envNotifyEmail,
}: {
  methods: MethodField[];
  orderNotifyEmail: string;
  envNotifyEmail: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updateStoreSettings, null);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {state && !state.ok && <Alert kind="error">{state.error}</Alert>}
      {state?.ok && <Alert kind="success">Saved.</Alert>}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Payments</h2>
        {methods.map((method) => (
          <Field
            key={method.id}
            label={`${method.label} receive address`}
            name={`wallet_${method.id}`}
            hint={`Shown to customers who pay with ${method.token} on ${method.chain}. Leave empty to hide payment instructions for this method.`}
            errors={state && !state.ok ? state.fieldErrors : undefined}
          >
            <input
              name={`wallet_${method.id}`}
              defaultValue={method.address}
              placeholder="0x..."
              spellCheck={false}
              autoComplete="off"
              className={`${inputClass} font-mono`}
            />
          </Field>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Notifications</h2>
        <Field
          label="New-order notification email"
          name="orderNotifyEmail"
          hint={`Where "New order" emails are sent. Leave empty to use the server default (${envNotifyEmail}).`}
          errors={state && !state.ok ? state.fieldErrors : undefined}
        >
          <input
            name="orderNotifyEmail"
            type="email"
            defaultValue={orderNotifyEmail}
            placeholder={envNotifyEmail}
            className={inputClass}
          />
        </Field>
      </section>

      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}
