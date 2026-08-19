/**
 * All prices are integers in minor units (euro cents). 49.99 EUR is 4999.
 * Never store or compute prices as floating point.
 *
 * This module is imported by client components, so it must NEVER import from
 * ./config - that file reads server-only environment variables and throws in
 * the browser. Locale and currency come from NEXT_PUBLIC_ vars (inlined at
 * build time into both bundles) with EUR defaults matching .env.example.
 */

const STORE_LOCALE = process.env.NEXT_PUBLIC_STORE_LOCALE ?? 'en-IE';
const STORE_CURRENCY = process.env.NEXT_PUBLIC_STORE_CURRENCY ?? 'EUR';

export class PriceParseError extends Error {
  constructor(input: string) {
    super(`Could not parse "${input}" as a price.`);
    this.name = 'PriceParseError';
  }
}

/**
 * Accepts "49.99" and "49,99" - admin input can come from any keyboard
 * layout. Throws on anything unparseable; it must NEVER silently fall back
 * to 0, which would publish a free product.
 */
export function parsePrice(input: string): number {
  const raw = String(input ?? '').trim();
  if (raw === '') throw new PriceParseError(input);

  // Strip spaces and thousands separators, normalise the decimal comma.
  const normalised = raw.replace(/\s/g, '').replace(/,/g, '.');

  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) throw new PriceParseError(input);

  const [whole, fraction = ''] = normalised.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  if (!Number.isSafeInteger(cents) || cents < 0) throw new PriceParseError(input);
  return cents;
}

/** Formats cents for display, e.g. 50000 -> "€500.00". */
export function formatPrice(cents: number, currency: string = STORE_CURRENCY): string {
  return new Intl.NumberFormat(STORE_LOCALE, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/** Formats cents for an editable input, e.g. 4999 -> "49.99". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
