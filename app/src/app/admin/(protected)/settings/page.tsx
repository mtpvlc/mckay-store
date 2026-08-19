import { requireAdmin } from '@/lib/auth';
import { config } from '@/lib/config';
import { getSettings, walletKey } from '@/db/queries/settings';
import { StoreSettingsForm } from '@/components/admin/StoreSettingsForm';

export default async function AdminSettingsPage() {
  await requireAdmin();

  const keys = ['order_notify_email', ...config.paymentMethods.map((m) => walletKey(m.id))];
  const stored = await getSettings(keys);

  const methods = config.paymentMethods.map((m) => ({
    id: m.id,
    label: m.label,
    chain: m.chain,
    token: m.token,
    address: stored.get(walletKey(m.id)) ?? '',
  }));

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Store settings</h1>
      <StoreSettingsForm
        methods={methods}
        orderNotifyEmail={stored.get('order_notify_email') ?? ''}
      />
    </div>
  );
}
