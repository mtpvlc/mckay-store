import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/auth';
import { AccountForms } from '@/components/shop/AccountForms';

export default async function AccountPage() {
  // Already signed in - no reason to show the login form.
  if (await getCustomerSession()) redirect('/account/orders');

  return (
    <div className="max-w-md py-4">
      <AccountForms />
    </div>
  );
}
