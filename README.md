# Shop — Complete Package

A production-ready e-commerce storefront with admin panel, built on Next.js 15, TypeScript, Tailwind, and PostgreSQL.

## 📦 What's Included

```
shop-complete/
├── app/                 # Next.js application (ready to run)
│   ├── src/            # Application source code
│   ├── drizzle/        # Database migrations
│   ├── scripts/        # Setup scripts (admin creation, migrations)
│   ├── public/         # Static assets
│   └── [config files]  # Next.js, TypeScript, Tailwind config
├── docs/               # Documentation (setup, architecture, deployment)
├── exports/            # Design exports and references
│   └── store-design.html  # Visual design export
└── README.md           # This file
```

## 🚀 Quick Start

```bash
cd app
npm install
npm run db:migrate
npm run admin:create
npm run dev
```

Then:
- **Shop:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/login

**Full setup instructions:** See [`docs/SETUP.md`](docs/SETUP.md)

## 💡 Key Features

- **Storefront** — Public-facing shop with product catalog and checkout
- **Admin Panel** — Manage products, prices, orders, and customers
- **Authentication** — Separate admin and customer session systems
- **Database** — PostgreSQL with Drizzle ORM; includes migrations
- **EUR Pricing** — Prices stored as integer cents (49.99 → 4999)
- **Order System** — Line items snapshot product state at purchase time
- **Admin Settings** — Wallet receive address and notification email editable in the admin panel (Admin → Settings), no redeploy needed
- **Email** — SMTP integration for order confirmations (configurable)
- **Responsive Design** — Tailwind CSS, works on mobile and desktop

## ⚙️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL 14+ with Drizzle ORM
- **Auth:** Session-based (cookies + database)
- **Email:** Nodemailer
- **Deployment:** Ready for Vercel, Railway, or self-hosted

## 📖 Documentation

Start here for your use case:

- **[SETUP.md](docs/SETUP.md)** — Database setup, environment config, local dev
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Project structure, design decisions, security notes
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Vercel, Railway, and self-hosted guides
- **[DESIGN.md](docs/DESIGN.md)** — Visual design reference and export info

## 🔐 Security Notes

- **Admin and customer auth are separate** — different cookies, secrets, and database tables
- **Prices are re-read from the database** — never trust prices sent by the browser
- **Auth is checked twice** — middleware + per-action verification
- **No default credentials** — you create the admin account during setup
- **Session validation** — sessions are checked against the database on every request

See **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** for detailed security considerations.

## 🎨 Design

The store design is included as an HTML export in `exports/store-design.html`. This is a reference for the visual layout and component structure. To view it in a browser, open the file directly.

## 📝 Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL=postgres://user:pass@host/dbname
ADMIN_SESSION_SECRET=<random 64-char hex>
CUSTOMER_SESSION_SECRET=<random 64-char hex>
SMTP_URL=smtp://user:pass@smtp.example.com:587
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # dev
```

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🚢 Deployment

**Quick deployment checklist:**

1. Set up PostgreSQL (Neon, Supabase, Railway, or self-hosted)
2. Create an admin account via `npm run admin:create`
3. Push to GitHub and deploy via Vercel, Railway, or your host
4. Add all env vars from `.env.example`
5. Run migrations against production: `DATABASE_URL="..." npm run db:migrate`

See **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** for step-by-step guides and provider-specific notes.

## 💬 Project Structure

| Path | Purpose |
|------|---------|
| `app/src/middleware.ts` | Cookie check (runs on edge) |
| `app/src/db/` | Schema and query helpers |
| `app/src/lib/` | Config, auth, money, storage, email |
| `app/src/actions/` | Server actions (API mutations) |
| `app/src/app/` | Page routes: shop (public) and admin (protected) |
| `app/src/components/` | Reusable UI components |
| `app/drizzle/` | Database migrations |
| `app/scripts/` | Setup utilities |

## ⚡ Next Steps

1. **Local Development** — Run `npm run dev` and explore the admin panel
2. **Customize** — Edit products, prices, branding in `src/app/(shop)/`
3. **Deploy** — Follow the deployment guide for your host
4. **Integrate Payments** — The order schema is ready for payment processors (see `ARCHITECTURE.md`)

## 📄 License

Unlicensed. Use freely.

---

**Questions or issues?** Check the docs folder or review the source code — it's well-structured and commented where it matters.
