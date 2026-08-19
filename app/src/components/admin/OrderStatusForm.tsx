'use client';

import { useActionState } from 'react';
import { updateOrderStatus } from '@/actions/orders';
import { ORDER_STATUSES, type ActionResult } from '@/lib/validation';
import { Alert, Field, SubmitButton, inputClass } from './ui';

export function OrderStatusForm({
  orderId,
  status,
  notes,
}: {
  orderId: string;
  status: string;
  notes: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updateOrderStatus, null);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && <Alert kind="error">{state.error}</Alert>}
      {state?.ok && <Alert kind="success">Saved.</Alert>}

      <input type="hidden" name="orderId" value={orderId} />

      <Field label="Status" name="status">
        <select name="status" defaultValue={status} className={inputClass}>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Internal notes" name="notes" hint="Not shown to the customer.">
        <textarea name="notes" rows={4} defaultValue={notes} className={inputClass} />
      </Field>

      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
