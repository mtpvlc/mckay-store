# McKay Shop — Handover Guide

How to transfer full ownership of the shop to a new owner. Three things move:
the **code** (GitHub), the **running shop** (Railway), and later a **domain**.
Nothing needs to be rebuilt — everything transfers with buttons.

Current state:
- Live shop: https://mckay-store-production.up.railway.app
- Admin panel: https://mckay-store-production.up.railway.app/admin/login
- Code: https://github.com/mtpvlc/mckay-store (private)
- Hosting: Railway project (app + PostgreSQL)

---

## What the NEW OWNER needs before the transfer

1. A **GitHub account** (free) — github.com
2. A **Railway account** (railway.app) — sign up **with the GitHub account**,
   and add a payment card (Hobby plan, ~$5/month, covers a shop this size)

That's it. Send the current owner your GitHub username and Railway account email.

---

## Transfer steps (current owner does these)

### 1. Transfer the GitHub repo

GitHub → `mckay-store` repo → **Settings** → scroll to **Danger Zone** →
**Transfer ownership** → enter the new owner's GitHub username → confirm.

The new owner gets an email and accepts. The repo (with full history) is now theirs.

### 2. Transfer the Railway project

Railway → open the project → **Project Settings** → **Transfer project** →
enter the new owner's Railway account email.

The new owner accepts the transfer in their Railway dashboard. Everything moves
live and untouched: the app, the database with all its data, variables, and the
public URL. Zero downtime. Billing switches to their card.

### 3. New owner reconnects GitHub to Railway

After both transfers, Railway can no longer read the repo (it moved accounts).
New owner: Railway → app service → **Settings** → **Source** → connect the
`mckay-store` repo under their own GitHub account (Railway will prompt to
install its GitHub app — allow it, select the repo). Root directory stays `app`.

From now on, every push to `main` auto-deploys.

---

## New owner's first-day checklist

### 1. Take over the admin account

Log in at `/admin/login` with the credentials the previous owner gives you.
Then, to set your own password, run this on any machine with Node.js 20+
(get `DATABASE_PUBLIC_URL` from Railway → Postgres service → enable Public
Access temporarily under Settings → Networking):

```bash
git clone https://github.com/YOUR-USERNAME/mckay-store.git
cd mckay-store/app
npm install
```

```powershell
$env:DATABASE_URL = "PASTE-DATABASE_PUBLIC_URL-HERE"; $env:ADMIN_EMAIL = "your@email.com"; $env:ADMIN_PASSWORD = "your-new-password"; npm run admin:create
```

(On Mac/Linux: `DATABASE_URL="..." ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create`)

Re-running with an existing email updates that admin's password — use this to
take over `admin@mckay.shop`, or create a fresh admin with your own email.

**Afterwards, disable Public Access on the Postgres service again**
(Settings → Networking) so the database is only reachable from inside Railway.

### 2. Set your wallet and email — in the admin panel

Log in → **Settings** (top navigation):
- **USDC (Base) receive address** — paste YOUR wallet address. From then on,
  customers see it with payment instructions on order confirmation.
- **New-order notification email** — YOUR inbox for "New order" alerts.

No redeploy needed; takes effect immediately.

### 3. Update two Railway variables

Railway → app service → **Variables**:
- `ORDER_NOTIFY_EMAIL` → your email (fallback if the Settings value is empty)
- `ADMIN_SESSION_SECRET` and `CUSTOMER_SESSION_SECRET` → generate fresh ones,
  since the previous owner had access to the old values:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Run twice, use different values for each. Changing them logs everyone out once.

### 4. Set up real email sending (currently OFF)

`SMTP_URL` points at a placeholder — order confirmation emails are silently
skipped (orders still work). Create a free account at [Resend](https://resend.com)
or [Brevo](https://brevo.com), get SMTP credentials, and set the Railway variables:

```
SMTP_URL=smtp://USERNAME:PASSWORD@HOST:587
ORDER_FROM_EMAIL=orders@yourdomain.com
```

### 5. Attach a volume for product images (IMPORTANT, do before adding products)

Product photos are stored on disk, which is wiped on every redeploy unless a
volume is attached. Railway → right-click the app service → **Attach Volume**
→ mount path: `/app/public/uploads`.

### 6. Custom domain (optional but recommended)

1. Buy a domain (Cloudflare / Porkbun / Namecheap, ~$10/year, WHOIS privacy
   is free and on by default)
2. Railway → app service → **Settings → Networking → Custom Domain** → add it
3. Copy the CNAME record Railway shows into your registrar's DNS settings
4. Update the `NEXT_PUBLIC_SITE_URL` variable to `https://yourdomain.com`

---

## Day-to-day operation (no code needed)

| Task | Where |
|---|---|
| Add/edit products, photos, prices | Admin → Products |
| Organise products into categories | Admin → Categories |
| See and process orders | Admin → Orders |
| Change wallet address or alert email | Admin → Settings |
| Mark an order paid | Admin → Orders → open order → set status |

**Payment flow:** customers choose USDC (Base) at checkout and are shown your
wallet address, the amount, and their order reference. You watch your wallet,
match incoming payments by amount/reference, and flip the order to `paid` in
the admin. Nothing on-chain is automated (yet) — the database schema is ready
for automatic payment detection as a future feature.

---

## If something breaks

- **Site down / errors** → Railway → app service → **Deploy Logs**
- **Redeploy** → Railway → Deployments → ⋮ on the latest → Redeploy
- **Database contents** → Railway → Postgres service → **Data** tab
- Docs in this repo: `docs/SETUP.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`
