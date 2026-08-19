import 'server-only';
import { formatPrice } from '../money';
import { config } from '../config';
import type { Mail } from '../mail';
import type { LineItem } from '@/db/schema';

/** Minimal escaping so a customer-supplied name cannot inject markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type OrderMailData = {
  reference: string;
  contactName: string;
  email: string;
  phone: string;
  addressRaw: string;
  notes?: string | null;
  status?: string;
  paymentMethodLabel: string;
  payAddress?: string | null;
  lineItems: LineItem[];
  subtotalCents: number;
  currency: string;
};

function itemsText(items: LineItem[], currency: string): string {
  return items
    .map(
      (i) =>
        `  ${i.qty} x ${i.nameSnapshot} - ${formatPrice(i.unitPriceCents, currency)} each = ${formatPrice(
          i.unitPriceCents * i.qty,
          currency,
        )}`,
    )
    .join('\n');
}

function itemsHtml(items: LineItem[], currency: string): string {
  const rows = items
    .map(
      (i) => `<tr>
      <td style="padding:6px 12px 6px 0">${esc(i.nameSnapshot)}</td>
      <td style="padding:6px 12px;text-align:right">${i.qty}</td>
      <td style="padding:6px 0;text-align:right">${formatPrice(i.unitPriceCents * i.qty, currency)}</td>
    </tr>`,
    )
    .join('');

  return `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows}</table>`;
}

/** Internal copy: full detail, including notes and status. */
export function orderNotificationInternal(data: OrderMailData): Mail {
  const text = [
    `New order ${data.reference}`,
    '',
    `Name:    ${data.contactName}`,
    `Email:   ${data.email}`,
    `Phone:   ${data.phone}`,
    `Address: ${data.addressRaw}`,
    `Payment: ${data.paymentMethodLabel}`,
    `Status:  ${data.status ?? 'new'}`,
    '',
    'Items:',
    itemsText(data.lineItems, data.currency),
    '',
    `Total: ${formatPrice(data.subtotalCents, data.currency)}`,
    data.notes ? `\nCustomer notes: ${data.notes}` : '',
    '',
    `${config.siteUrl}/admin/orders`,
  ].join('\n');

  const html = `<div style="font-family:sans-serif;font-size:14px;color:#111827">
    <h2 style="margin:0 0 16px">New order ${esc(data.reference)}</h2>
    <p style="margin:0 0 4px"><strong>Name:</strong> ${esc(data.contactName)}</p>
    <p style="margin:0 0 4px"><strong>Email:</strong> ${esc(data.email)}</p>
    <p style="margin:0 0 4px"><strong>Phone:</strong> ${esc(data.phone)}</p>
    <p style="margin:0 0 4px"><strong>Address:</strong> ${esc(data.addressRaw)}</p>
    <p style="margin:0 0 4px"><strong>Payment:</strong> ${esc(data.paymentMethodLabel)}</p>
    <p style="margin:0 0 16px"><strong>Status:</strong> ${esc(data.status ?? 'new')}</p>
    ${itemsHtml(data.lineItems, data.currency)}
    <p style="margin:16px 0 0"><strong>Total: ${formatPrice(data.subtotalCents, data.currency)}</strong></p>
    ${data.notes ? `<p style="margin:16px 0 0"><strong>Customer notes:</strong> ${esc(data.notes)}</p>` : ''}
    <p style="margin:24px 0 0"><a href="${config.siteUrl}/admin/orders">Open in admin</a></p>
  </div>`;

  return { to: config.orderNotifyEmail, subject: `New order ${data.reference}`, text, html };
}

/** Customer copy: no internal notes, no status field. */
export function orderConfirmationCustomer(data: OrderMailData): Mail {
  const text = [
    `Thank you for your order, ${data.contactName}.`,
    '',
    `Order reference: ${data.reference}`,
    '',
    'Items:',
    itemsText(data.lineItems, data.currency),
    '',
    `Total: ${formatPrice(data.subtotalCents, data.currency)}`,
    '',
    `Delivery address: ${data.addressRaw}`,
    `Payment method:   ${data.paymentMethodLabel}`,
    '',
    data.payAddress
      ? [
          `Please send ${formatPrice(data.subtotalCents, data.currency)} (${data.paymentMethodLabel}) to:`,
          '',
          `  ${data.payAddress}`,
          '',
          `Include your order reference ${data.reference} if the wallet supports a note.`,
        ].join('\n')
      : 'We will be in touch with payment instructions shortly.',
  ].join('\n');

  const html = `<div style="font-family:sans-serif;font-size:14px;color:#111827">
    <h2 style="margin:0 0 16px">Thank you for your order</h2>
    <p style="margin:0 0 16px">Order reference: <strong>${esc(data.reference)}</strong></p>
    ${itemsHtml(data.lineItems, data.currency)}
    <p style="margin:16px 0 0"><strong>Total: ${formatPrice(data.subtotalCents, data.currency)}</strong></p>
    <p style="margin:16px 0 4px"><strong>Delivery address:</strong> ${esc(data.addressRaw)}</p>
    <p style="margin:0 0 16px"><strong>Payment method:</strong> ${esc(data.paymentMethodLabel)}</p>
    ${
      data.payAddress
        ? `<div style="margin:0;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;background:#f9fafb">
            <p style="margin:0 0 8px">Please send <strong>${formatPrice(data.subtotalCents, data.currency)}</strong> (${esc(data.paymentMethodLabel)}) to:</p>
            <p style="margin:0 0 8px;font-family:monospace;font-size:13px;word-break:break-all"><strong>${esc(data.payAddress)}</strong></p>
            <p style="margin:0;font-size:12px;color:#6b7280">Include your order reference ${esc(data.reference)} if the wallet supports a note.</p>
          </div>`
        : `<p style="margin:0">We will be in touch with payment instructions shortly.</p>`
    }
  </div>`;

  return { to: data.email, subject: `Your order ${data.reference}`, text, html };
}
