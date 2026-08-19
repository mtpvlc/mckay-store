'use client';

import { useActionState } from 'react';
import { changePassword, updateProfile } from '@/actions/customers';
import type { ActionResult } from '@/lib/validation';

const inputClass = 'w-full rounded-card border border-line px-3 py-2 text-sm outline-none focus:border-brand';
const buttonClass = 'rounded-card bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover';

export function SettingsForms({
  defaults,
}: {
  defaults: { name: string; phone: string; addressRaw: string };
}) {
  const [profileState, profileAction] = useActionState<ActionResult | null, FormData>(updateProfile, null);
  const [passwordState, passwordAction] = useActionState<ActionResult | null, FormData>(changePassword, null);

  return (
    <div className="space-y-10">
      <form action={profileAction} className="space-y-4">
        <h2 className="text-sm font-semibold">Profile</h2>
        <Status state={profileState} okMessage="Profile saved." />

        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Name</span>
          <input name="name" defaultValue={defaults.name} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Phone</span>
          <input name="phone" defaultValue={defaults.phone} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Delivery address</span>
          <textarea name="addressRaw" rows={4} defaultValue={defaults.addressRaw} className={inputClass} />
        </label>

        <button type="submit" className={buttonClass}>Save profile</button>
      </form>

      <form action={passwordAction} className="space-y-4 border-t border-line pt-8">
        <h2 className="text-sm font-semibold">Change password</h2>
        <Status state={passwordState} okMessage="Password changed. Other devices have been signed out." />

        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Current password</span>
          <input name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">New password</span>
          <input name="newPassword" type="password" required autoComplete="new-password" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-muted">Confirm new password</span>
          <input name="confirmPassword" type="password" required autoComplete="new-password" className={inputClass} />
        </label>

        <button type="submit" className={buttonClass}>Change password</button>
      </form>
    </div>
  );
}

function Status({ state, okMessage }: { state: ActionResult | null; okMessage: string }) {
  if (!state) return null;
  return state.ok ? (
    <div className="rounded-card border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
      {okMessage}
    </div>
  ) : (
    <div className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
      {state.error}
    </div>
  );
}
