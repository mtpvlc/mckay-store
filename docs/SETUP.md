# Setup Guide

Complete walkthrough for setting up the shop locally.

## Prerequisites

- Node.js 20 or newer
- PostgreSQL 14+ (local, Neon, Supabase, Railway, etc.)
- npm or yarn

## Step 1: Install Dependencies

```bash
cd app
npm install
```

## Step 2: Database Setup

Choose your database provider:

### Neon (Recommended for quick testing)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project and database
3. Copy the connection string (it will look like `postgresql://user:pass@host/dbname?sslmode=require`)

### Supabase

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database → Connection String
4. Copy the PostgreSQL connection string

### Railway

1. Create a PostgreSQL service
2. Copy the connection string from the service details

### Self-Hosted

Any PostgreSQL 14+ instance works. Connection string format:
```
postgres://user:password@localhost:5432/shopdb
```

**Note:** Hosted providers often require `?sslmode=require` at the end of the URL.

## Step 3: Environment Variables

Create `.env.local` by copying the example:

```bash
cp .env.example .env.local
```

Now fill in each variable. Open `.env.local` and edit:

### Database

Set `DATABASE_URL` to your PostgreSQL connection string from Step 2.

### Secrets

Generate two separate random 64-character hex strings:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- `ADMIN_SESSION_SECRET` — must be random and different from customer secret
- `CUSTOMER_SESSION_SECRET` — must be different from admin secret

Run the command twice to get two different values.

### Email (SMTP)

For local testing, you can use **maildev**:

```bash
npx maildev   # runs on port 1025, open http://localhost:1080 to see emails
```

Then set in `.env.local`:
```
SMTP_URL=smtp://localhost:1025
SMTP_FROM_EMAIL=noreply@shop.local
```

For production, use your email service (e.g., SendGrid, Mailgun, AWS SES):
```
SMTP_URL=smtp://user:password@smtp.provider.com:587
SMTP_FROM_EMAIL=orders@yourshop.com
```

### Site URL

For local development:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For production, use your actual domain:
```
NEXT_PUBLIC_SITE_URL=https://shop.example.com
```

## Step 4: Run Migrations

Create the database schema:

```bash
npm run db:migrate
```

This creates all tables (products, orders, customers, sessions, etc.).

To see the schema visually, run:
```bash
npm run db:studio
```

This opens Drizzle Studio at http://localhost:5555.

## Step 5: Create an Admin Account

```bash
npm run admin:create
```

You'll be prompted for an email and password. This creates the first admin user.

Non-interactively (for scripting):
```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword npm run admin:create
```

## Step 6: Start the Dev Server

```bash
npm run dev
```

Open in your browser:

- **Shop (public):** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/login

Log in with the email and password you created in Step 5.

## Verification

After setup, verify that authentication works:

1. **Unauthenticated access is blocked**
   - Open a private/incognito window
   - Go to http://localhost:3000/admin/products
   - Should redirect to login page

2. **Admin login works**
   - Sign in with your admin account
   - Should see the products list

3. **Sessions are database-backed**
   - While signed in, open another terminal and delete the admin session:
     ```bash
     node -e "
       const postgres = require('postgres');
       const sql = postgres(process.env.DATABASE_URL);
       sql('DELETE FROM admin_sessions LIMIT 1').then(() => process.exit());
     "
     ```
   - Reload the page
   - Should redirect to login (session was invalidated)

## Optional: Sample Data

To add some sample products for testing, you can edit `app/scripts/create-admin.ts` to also seed products, or use the admin panel to create them manually.

## Troubleshooting

### "Cannot find module 'postgres'"
```bash
npm install postgres
```

### Database connection fails
- Check that `DATABASE_URL` is correct
- If using a hosted provider, ensure `?sslmode=require` is at the end
- Test the connection: `npm run db:studio`

### "ADMIN_SESSION_SECRET and CUSTOMER_SESSION_SECRET must be different"
Run the generation command twice to create two different values.

### Emails not sending
- For local testing, run `npx maildev` and check http://localhost:1080
- For production, verify `SMTP_URL` and `SMTP_FROM_EMAIL` are correct

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

## Next Steps

- Check out **[ARCHITECTURE.md](ARCHITECTURE.md)** to understand the codebase
- See **[DEPLOYMENT.md](DEPLOYMENT.md)** when you're ready to go live
- Explore the admin panel to create products and test the checkout flow
