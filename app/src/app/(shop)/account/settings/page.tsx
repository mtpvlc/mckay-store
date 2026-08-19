import { requireCustomer } from '@/lib/auth';
import { getCustomerById } from '@/db/queries/customers';
import { SettingsForms } from '@/components/shop/SettingsForms';

export default async function SettingsPage() {
  const session = await requireCustomer();
  const customer = await getCustomerById(session.customerId);

  return (
    <div className="max-w-md py-4">
      <h1 className="mb-6 text-xl font-semibold">Settings</h1>
      <SettingsForms
        defaults={{
          name: customer?.name ?? '',
          phone: customer?.phone ?? '',
          addressRaw: customer?.addressRaw ?? '',
        }}
      />
    </div>
  );
}
