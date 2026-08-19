import { z } from 'zod';
import { parsePrice } from './money';

/* ------------------------------------------------------------------ shared */

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .max(254)
  .toLowerCase(); // uniqueness is enforced on the lowercased value

/**
 * Deliberately loose. The store is international, so any country-specific
 * pattern would reject real customers on day one.
 */
const phone = z
  .string()
  .trim()
  .min(5, 'Enter a valid phone number')
  .max(32)
  .regex(/^[\d\s+()\-.]+$/, 'Phone can contain digits, spaces and + ( ) - . only');

const password = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password must be at most 200 characters');

/** Cents parsed from free-text admin input; never falls back to 0. */
const priceInput = z.string().superRefine((value, ctx) => {
  try {
    parsePrice(value);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a price like 49.99' });
  }
}).transform((value) => parsePrice(value));

/* --------------------------------------------------------------- products */

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  price: priceInput,
  stock: z.coerce.number().int().min(0).max(1_000_000),
  isActive: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(100_000).default(0),
});

export type ProductInput = z.infer<typeof productSchema>;

/* ----------------------------------------------------------------- orders */

export const lineItemInputSchema = z.object({
  productId: z.string().uuid(),
  qty: z.coerce.number().int().min(1).max(999),
});

export const orderFormSchema = z.object({
  contactName: z.string().trim().min(1, 'Name is required').max(200),
  email,
  phone,
  addressRaw: z.string().trim().min(5, 'Delivery address is required').max(2000),
  paymentMethodId: z.string().trim().min(1, 'Select a payment method'),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  items: z.array(lineItemInputSchema).min(1, 'Your order is empty'),
});

export type OrderFormInput = z.infer<typeof orderFormSchema>;

export const orderStatusSchema = z.enum([
  'new',
  'awaiting_payment',
  'paid',
  'shipped',
  'cancelled',
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'awaiting_payment',
  'paid',
  'shipped',
  'cancelled',
];

export const orderAdminUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: orderStatusSchema,
  notes: z.string().trim().max(5000).optional().or(z.literal('')),
});

/* --------------------------------------------------------------- accounts */

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(200),
});

export const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().max(200).optional().or(z.literal('')),
});

export const profileSchema = z.object({
  name: z.string().trim().max(200).optional().or(z.literal('')),
  phone: phone.optional().or(z.literal('')),
  addressRaw: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/* -------------------------------------------------------------- utilities */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
