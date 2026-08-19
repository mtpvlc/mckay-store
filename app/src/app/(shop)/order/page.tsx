import { listPublicProducts } from '@/db/queries/products';
import { getCustomerSession } from '@/lib/auth';
import { getCustomerById } from '@/db/queries/customers';
import { config } from '@/lib/config';
import { OrderForm } from '@/components/shop/OrderForm';

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const params = await searchParams;
  const products = await listPublicProducts();

  // Guest checkout is supported; a session only prefills the form.
  const session = await getCustomerSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  return (
    <>
      <h1 className="mb-8 text-xl font-semibold">Place an order</h1>
      <OrderForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          currency: p.currency,
          stock: p.stock,
        }))}
        paymentMethods={config.paymentMethods}
        initialProductId={params.product}
        prefill={
          customer
            ? {
                contactName: customer.name ?? undefined,
                email: customer.email,
                phone: customer.phone ?? undefined,
                addressRaw: customer.addressRaw ?? undefined,
              }
            : undefined
        }
      />
    </>
  );
}
