import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  char,
  timestamp,
  index,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    priceCents: integer('price_cents').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('EUR'),
    stock: integer('stock').notNull().default(0),
    images: text('images')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('products_active_sort_idx').on(t.isActive, t.sortOrder),
    index('products_deleted_idx').on(t.deletedAt),
  ],
);

export const priceHistory = pgTable(
  'price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    oldPriceCents: integer('old_price_cents'),
    newPriceCents: integer('new_price_cents').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('price_history_product_idx').on(t.productId, t.changedAt)],
);

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  phone: text('phone'),
  addressRaw: text('address_raw'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('admin_sessions_admin_idx').on(t.adminId),
    index('admin_sessions_expires_idx').on(t.expiresAt),
  ],
);

export const customerSessions = pgTable(
  'customer_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp('absolute_expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('customer_sessions_customer_idx').on(t.customerId),
    index('customer_sessions_expires_idx').on(t.expiresAt),
  ],
);

export const rateLimits = pgTable(
  'rate_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    count: integer('count').notNull().default(1),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('rate_limits_reset_idx').on(t.resetAt)],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reference: text('reference').notNull().unique(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    contactName: text('contact_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    addressRaw: text('address_raw').notNull(),
    notes: text('notes'),
    status: text('status').notNull().default('new'),
    currency: char('currency', { length: 3 }).notNull().default('EUR'),
    lineItems: jsonb('line_items').notNull().$type<LineItem[]>(),
    subtotalCents: integer('subtotal_cents').notNull(),
    // Phase 2 (on-chain payment detection). Nullable and UNUSED in this build.
    paymentChain: text('payment_chain'),
    paymentToken: text('payment_token'),
    payAddress: text('pay_address'),
    amountAtomic: text('amount_atomic'),
    quoteRate: text('quote_rate'),
    quoteExpiresAt: timestamp('quote_expires_at', { withTimezone: true }),
    txHash: text('tx_hash'),
    confirmations: integer('confirmations'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('orders_status_idx').on(t.status),
    index('orders_customer_idx').on(t.customerId),
    index('orders_created_idx').on(t.createdAt),
    index('orders_email_idx').on(t.email),
  ],
);

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    txHash: text('tx_hash').notNull(),
    // NOT NULL with -1 sentinel: Postgres treats NULLs as distinct in unique
    // constraints, so a nullable column would break deduplication for exactly
    // the native transfers that have no log index.
    logIndex: integer('log_index').notNull().default(-1),
    amountAtomic: text('amount_atomic').notNull(),
    blockNumber: bigint('block_number', { mode: 'number' }),
    seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('payment_events_order_idx').on(t.orderId),
    unique('payment_events_tx_log_idx').on(t.txHash, t.logIndex),
  ],
);

export type LineItem = {
  productId: string;
  nameSnapshot: string;
  unitPriceCents: number;
  qty: number;
};

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type PriceHistoryRow = typeof priceHistory.$inferSelect;
