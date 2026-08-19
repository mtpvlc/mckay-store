# Architecture Guide

Overview of the shop's design, code structure, and key decisions.

## Project Structure

```
app/src/
├── middleware.ts          # Edge middleware: cookie presence check only
├── db/
│   ├── schema.ts          # Drizzle schema (single source of truth)
│   └── queries/           # Read helpers, organized by table
├── lib/
│   ├── config.ts          # Environment variables (only file that reads process.env)
│   ├── auth.ts            # Session management (admin and customer)
│   ├── money.ts           # parsePrice() and formatPrice()
│   ├── rateLimit.ts       # Database-backed rate limiting
│   ├── storage/           # File storage abstraction (local disk, S3 stub)
│   └── mail/              # Email sending (Nodemailer + templates)
├── actions/               # Server actions (all mutations)
│   ├── auth.ts            # Login, logout, register
│   ├── customers.ts       # Customer profile updates
│   ├── orders.ts          # Order creation and updates
│   └── products.ts        # Admin product CRUD
├── app/
│   ├── (shop)/            # Public storefront
│   │   ├── page.tsx       # Homepage
│   │   ├── products/      # Product listing and detail pages
│   │   └── checkout/      # Cart and order form
│   ├── admin/
│   │   ├── login/         # No auth required
│   │   └── (protected)/   # All protected with requireAdmin()
│   │       ├── products/  # Manage products
│   │       ├── orders/    # View orders
│   │       └── customers/ # View customers
│   └── globals.css        # Global styles
└── components/            # Reusable UI components
    ├── Header.tsx
    ├── ProductCard.tsx
    └── ...
```

## Database Schema

Key tables in PostgreSQL:

### `products`
- `id`, `name`, `description`, `price_cents`, `image_url`
- `deleted_at` — soft delete (row preserved for order history)
- `created_at`, `updated_at`

### `orders`
- `id`, `customer_id`, `status` (pending, paid, shipped, etc.)
- `total_cents`, `payment_method`, `payment_ref` (nullable, for on-chain detection)
- `shipping_address`, `created_at`, `updated_at`

### `order_line_items`
- `id`, `order_id`, `product_name`, `unit_price_cents`, `quantity`
- Snapshots the product state at purchase time

### `customers`
- `id`, `email`, `password_hash`
- `billing_address`, `shipping_address`
- `created_at`, `updated_at`

### `customer_sessions`
- `id`, `customer_id`, `expires_at`

### `admin_users`
- `id`, `email`, `password_hash`
- `created_at`, `updated_at`

### `admin_sessions`
- `id`, `admin_id`, `expires_at`

Run migrations to create these:
```bash
npm run db:migrate
```

View the schema in Drizzle Studio:
```bash
npm run db:studio
```

## Authentication

### Admin Sessions

1. Admin logs in at `/admin/login` (public page outside the auth gate)
2. Credentials checked against `admin_users` table
3. Session created in `admin_sessions` table (expires in 7 days by default)
4. Session ID stored in a **cookie** (`admin-session`)
5. On every request:
   - Middleware checks if cookie exists (edge runtime, no DB)
   - Page or server action calls `requireAdmin()`, which queries DB to validate the session
   - If session is invalid or deleted, user is redirected to login

### Customer Sessions

Identical structure, but separate tables and secrets:
- Cookies: `customer-session`
- Tables: `customers`, `customer_sessions`
- Session secret: `CUSTOMER_SESSION_SECRET`

### Why Separate?

Admin and customer sessions are **intentionally separate**:
- Different cookies, secrets, database tables, and functions
- A customer cannot authenticate as an admin by compromising one session type
- Session validation happens per-request, not in middleware (which runs on edge and can't query DB)

## Key Design Decisions

### Prices as Integers

Prices are stored as integer cents, not decimals:
- `49.99 EUR` → `4999` in the database
- Avoids floating-point rounding errors
- JavaScript handles integers safely up to 2^53

Use helpers:
```typescript
import { parsePrice, formatPrice } from '@/lib/money'

formatPrice(4999)  // "€49.99"
parsePrice("49.99") // 4999
```

### Soft Deletes

Products are soft-deleted (set `deleted_at`, keep the row):
- Order line items reference product history by snapshot, not by ID
- Deleting a product does not affect past orders
- Admins can see what products were originally ordered

### Order Line Item Snapshots

When an order is submitted:
1. Product name and unit price are **copied** to `order_line_items`
2. Changing a product later does **not** rewrite history
3. Customers see the exact price and name they ordered

This is enforced in `src/actions/orders.ts` — prices are re-read from the database before submission, never trusted from the browser.

### Stock Management

Stock is **checked but not decremented**:
- An unpaid order could occupy stock, starving other customers
- **Best practice:** Decrement stock only when payment confirms
- Schema has `stock_quantity` column; implement decrements in your payment processor webhook

### No Default Credentials

There are no hardcoded admin credentials in the repo. You must run `npm run admin:create` during setup. This prevents accidental production access.

## Rate Limiting

The `rateLimit()` function in `src/lib/rateLimit.ts` uses a database-backed fixed window:

```typescript
await rateLimit(req, {
  key: 'checkout:' + customerId,
  maxRequests: 5,
  windowSeconds: 60
})
```

Limits 5 checkout attempts per customer per minute.

## Email

SMTP configuration is read from `SMTP_URL` in `.env.local`. Uses Nodemailer for sending.

Templates live in `src/lib/mail/templates/`.

**For local testing:** Run `npx maildev` and check http://localhost:1080 for emails.

**For production:** Use any SMTP service (SendGrid, Mailgun, AWS SES, etc.). Update `SMTP_URL`.

## Storage

File storage abstraction in `src/lib/storage/`:

- **Development:** `src/lib/storage/local.ts` — writes to `public/uploads/`
- **Production (Vercel):** Implement `src/lib/storage/s3.ts` for S3, Cloudflare R2, or Supabase Storage

The stub throws an error if you try to upload without implementing S3. This prevents silently losing files on ephemeral filesystems.

## Server Actions

All mutations are server actions in `src/actions/`:

```typescript
// src/actions/products.ts
'use server'

export async function createProduct(formData: FormData) {
  const admin = await requireAdmin() // Check auth
  
  // Validate input
  const parsed = productSchema.parse(Object.fromEntries(formData))
  
  // Mutate database
  const product = await db.insert(products).values(parsed)
  
  return product
}
```

Server actions:
- Run on the server (credentials never leak to the browser)
- Are called directly from forms or client components
- Serialize arguments and return values over HTTP

Never trust any data from the browser. Always re-validate and re-check auth server-side.

## Middleware

`src/middleware.ts` runs on the edge and is minimal:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // Only check if a session cookie exists
  const hasCookie = 
    req.cookies.has('admin-session') || 
    req.cookies.has('customer-session')
  
  // Redirect to login if no cookie and accessing protected route
  if (!hasCookie && req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  
  return NextResponse.next()
}
```

**Important:** Middleware cannot query the database (it runs on edge, which has no database access). Real auth validation happens in `requireAdmin()` and `requireCustomer()`.

## Security Considerations

### 1. Auth is Checked Twice

- **Middleware:** Cookie presence (edge, fast)
- **Per-action:** Session validity in database (verifies session still exists and hasn't expired)

If you add a new admin page, ensure it calls `requireAdmin()`. A layout-only check does not protect server actions, which can be invoked directly over HTTP.

### 2. Prices are Re-Read

The order form submits product IDs, not prices. Before creating an order, prices are re-read from the database:

```typescript
// src/actions/orders.ts
const lineItems = await Promise.all(
  items.map(async (item) => {
    const product = await db.query.products.findFirst(...)
    return {
      product_name: product.name,
      unit_price_cents: product.price_cents, // From DB, not browser
      quantity: item.quantity
    }
  })
)
```

Never trust prices sent by the browser. Always fetch current prices server-side.

### 3. No CSRF Token Needed

Next.js 13+ server actions prevent CSRF automatically via HTTP method verification. Form submissions use safe defaults.

### 4. Rate Limiting

Checkout and login endpoints are rate-limited to prevent brute force attacks. See `rateLimit()` in `src/lib/rateLimit.ts`.

### 5. Session Secrets Must Differ

`ADMIN_SESSION_SECRET` and `CUSTOMER_SESSION_SECRET` must be different. The app enforces this and will not start otherwise. This prevents cross-contamination if one secret is compromised.

## Payment Integration

The schema is ready for payments, but no payment processor is implemented yet. To add payments:

1. Choose a provider (Stripe, PayPal, etc.)
2. Collect payment info in checkout (or redirect to provider)
3. On successful payment, webhook calls a server action to:
   - Update order `status` to "paid"
   - Decrement `product.stock_quantity`
   - Confirm the order and send a confirmation email

The `amount_atomic` column in orders is text (not numeric) to handle 18-decimal tokens. Update this column when adding payment support.

## Deploying to Production

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for step-by-step guides.

Key points:
- Use a managed PostgreSQL service (Neon, Supabase, Railway)
- Implement S3-based file storage (Vercel's filesystem is ephemeral)
- Set all env vars from `.env.example`
- Run `npm run db:migrate` against production before first deploy
- Create an admin account in production: `npm run admin:create`

## Performance

### Database Queries

Use Drizzle query helpers in `src/db/queries/` instead of raw SQL. They are typed and composable.

### Caching

Next.js 13+ caches by default. Use `revalidatePath()` to invalidate caches after mutations:

```typescript
import { revalidatePath } from 'next/cache'

export async function createProduct(...) {
  // ... create product
  revalidatePath('/admin/products')
  revalidatePath('/products')
}
```

### Images

Use Next.js `<Image>` component for automatic optimization and responsive sizing.

## Testing

The repo includes no tests yet. To add:

1. Install a test runner: `npm install --save-dev vitest @testing-library/react`
2. Create `.test.ts` files in the same directory as source files
3. Test server actions and database queries

Example:
```typescript
// src/actions/products.test.ts
import { test, expect } from 'vitest'
import { createProduct } from './products'

test('createProduct creates a product in the database', async () => {
  // ...
})
```

## Troubleshooting

### "ReferenceError: process is not defined"

Files in the `app/` directory can be client or server. Use `'use server'` at the top of server-only files.

### "Cannot query the database from the edge"

Middleware runs on edge. It cannot import from `@/db`. Only check for cookies in middleware. Do the real validation in server actions via `requireAdmin()`.

### Type errors in database queries

Drizzle is fully typed. TypeScript will catch schema mismatches. Run `npm run db:generate` after changing `src/db/schema.ts`.

---

For questions about specific parts, check the source code — it's well-structured and commented where it matters.
