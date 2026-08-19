# Shop

Next.js storefront with an admin panel for managing products, prices and orders.

- **Stack:** Next.js 15 (App Router), TypeScript, Tailwind, Postgres via Drizzle ORM
- **Currency:** EUR only. Prices are stored as integers in cents (49.99 becomes 4999).
- **Payments:** manual crypto payments. The admin sets a receive address per
  payment method under Admin → Settings; customers see it (with the amount and
  order reference) on the confirmation page and in the confirmation email. The
  address is snapshotted onto each order at submit time. Nothing in this build
  watches the chain - marking an order paid is a manual admin step.

---

## Setup

### 1. Install

```bash
npm install
```

Requires Node.js 20 or newer.

### 2. Database

Any Postgres 14+ instance works: [Neon](https://neon.tech), [Supabase](https://supabase.com),
Railway, or self-hosted. Create a database and copy the connection string.

Hosted providers usually need `?sslmode=require` on the end of the URL.

### 3. Environment

```bash
cp .env.example .env.local
```

Fill in every value. `.env.example` documents each one. Two notes:

- `ADMIN_SESSION_SECRET` and `CUSTOMER_SESSION_SECRET` must be **different**.
  The app refuses to start otherwise. Generate each with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- `SMTP_URL` can point at anything that speaks SMTP. For local testing run
  `npx maildev` and use `smtp://localhost:1025`.

### 4. Migrations

```bash
npm run db:generate   # only after changing src/db/schema.ts
npm run db:migrate    # applies migrations
```

### 5. Create an admin

```bash
npm run admin:create
```

Prompts for an email and password. There are no default credentials anywhere
in this repo. Non-interactively:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword npm run admin:create
```

### 6. Run

```bash
npm run dev
```

- Shop: http://localhost:3000
- Admin: http://localhost:3000/admin/login

---

## Verifying auth works

Worth doing once after setup. All three must pass.

1. **Unauthenticated access is blocked.** Open a private window and go straight
   to `/admin/products`. It must redirect to the login page.
2. **Login works.** Sign in. You should land on the products list.
3. **Sessions are checked against the database.** While signed in, delete the
   row from `admin_sessions` and reload. It must redirect to login. If the page
   still loads, the session lookup is not reaching the database.

---

## Deploying

### Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add every variable from `.env.example` under Settings, Environment Variables.
3. Set `NEXT_PUBLIC_SITE_URL` to the production domain, no trailing slash.
4. Deploy, then run migrations against the production database from your
   machine with `DATABASE_URL` pointing at it:

   ```bash
   DATABASE_URL="postgres://..." npm run db:migrate
   DATABASE_URL="postgres://..." npm run admin:create
   ```

**Uploads on Vercel:** the filesystem is ephemeral, so images written to
`public/uploads` disappear on redeploy. For production on Vercel, implement
`src/lib/storage/s3.ts` (S3, Cloudflare R2 or Supabase Storage) and swap the
export at the bottom of `src/lib/storage.ts`. The stub throws rather than
silently dropping files.

### Railway or a VPS

1. Add a Postgres service and set `DATABASE_URL` from it.
2. Set the remaining environment variables.
3. Mount a persistent volume at `public/uploads` so images survive restarts.
4. Build with `npm run build`, start with `npm run start`.

---

## Project layout

```
src/
  middleware.ts        Cookie presence check only. Runs on the edge, so it
                       must never import from @/db.
  db/
    schema.ts          Drizzle schema, single source of truth
    queries/           Read helpers, split by table
  lib/
    config.ts          The only file that reads process.env
    auth.ts            Admin and customer sessions, kept fully separate
    money.ts           parsePrice / formatPrice
    rateLimit.ts       Database-backed fixed window
    storage/           Local disk now, S3 stub for later
    mail/              Nodemailer plus templates
  actions/             All server actions (mutations)
  app/
    (shop)/            Public storefront
    admin/login/       Outside the auth gate
    admin/(protected)/ Everything requiring an admin session
  components/
```

## Things worth knowing before changing the code

- **Auth is checked twice on purpose.** Middleware only sees whether a cookie
  exists; it cannot query the database from the edge runtime. The real gate is
  `requireAdmin()` inside every admin page and server action. Adding a new admin
  page or action means adding that call - a layout check does not protect a
  server action, which can be invoked directly over HTTP.
- **Admin and customer auth share no code path.** Separate cookies, secrets,
  tables and functions. Do not refactor them into one "is there a session"
  helper.
- **Prices are re-read from the database on order submit.** Never trust a price
  sent by the browser.
- **Products are soft deleted.** `deleted_at` is set; the row stays so past
  orders keep their history. There is no hard delete.
- **Order line items are snapshots.** Name and unit price are copied onto the
  order at submit time, so changing a product later does not rewrite history.
- **Stock is checked but not decremented.** Reserving stock on an unpaid order
  means abandoned orders silently eat inventory. Decrement when payment
  confirms.
- **`amount_atomic` is text, not a number.** 18-decimal tokens overflow numeric
  types. This matters when payments are added.
