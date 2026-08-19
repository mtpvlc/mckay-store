import { z } from 'zod';

/**
 * THE ONLY FILE IN src/ THAT READS process.env.
 *
 * Everything is validated at import time, so a missing or malformed variable
 * fails at boot with a readable message rather than at first use in a request.
 */

const paymentMethodSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  chain: z.string().min(1),
  token: z.string().min(1),
});

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  ADMIN_SESSION_SECRET: z.string().min(32, 'ADMIN_SESSION_SECRET must be at least 32 chars'),
  CUSTOMER_SESSION_SECRET: z.string().min(32, 'CUSTOMER_SESSION_SECRET must be at least 32 chars'),
  ORDER_NOTIFY_EMAIL: z.string().email(),
  ORDER_FROM_EMAIL: z.string().email().optional(),
  SMTP_URL: z.string().min(1),
  UPLOAD_DIR: z.string().default('./public/uploads'),
  PAYMENT_METHODS: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PAYMENT_METHODS must be valid JSON' });
        return z.NEVER;
      }
    })
    .pipe(z.array(paymentMethodSchema).min(1)),
  STORE_LOCALE: z.string().default('en-IE'),
  STORE_CURRENCY: z.string().length(3).default('EUR'),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${detail}\n\nCheck .env.local against .env.example.`);
}

const env = parsed.data;

export const config = {
  isProduction: env.NODE_ENV === 'production',
  databaseUrl: env.DATABASE_URL,
  adminSessionSecret: env.ADMIN_SESSION_SECRET,
  customerSessionSecret: env.CUSTOMER_SESSION_SECRET,
  orderNotifyEmail: env.ORDER_NOTIFY_EMAIL,
  orderFromEmail: env.ORDER_FROM_EMAIL ?? env.ORDER_NOTIFY_EMAIL,
  smtpUrl: env.SMTP_URL,
  uploadDir: env.UPLOAD_DIR,
  paymentMethods: env.PAYMENT_METHODS,
  storeLocale: env.STORE_LOCALE,
  storeCurrency: env.STORE_CURRENCY,
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
} as const;

if (config.adminSessionSecret === config.customerSessionSecret) {
  throw new Error('ADMIN_SESSION_SECRET and CUSTOMER_SESSION_SECRET must be different values.');
}

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
