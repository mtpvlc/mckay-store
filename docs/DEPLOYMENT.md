# Deployment Guide

Step-by-step guides for deploying to production.

## Before You Deploy

Checklist:

- [ ] Database is set up (Neon, Supabase, Railway, or self-hosted)
- [ ] Admin account created: `npm run admin:create`
- [ ] All env vars from `.env.example` are filled in
- [ ] Images are working (use next/image component)
- [ ] For Vercel: implement S3 storage before deploying
- [ ] SMTP is configured for production email
- [ ] `ADMIN_SESSION_SECRET` and `CUSTOMER_SESSION_SECRET` are different and strong

## Vercel (Recommended)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/yourusername/shop.git
git push -u origin main
```

### 2. Import into Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select the repo from GitHub
4. Click "Import"

### 3. Set Environment Variables

In Vercel Settings, add each variable from `.env.example`:

```
DATABASE_URL=postgres://...?sslmode=require
ADMIN_SESSION_SECRET=[64-char hex]
CUSTOMER_SESSION_SECRET=[64-char hex]
SMTP_URL=smtp://...
SMTP_FROM_EMAIL=orders@yourdomain.com
NEXT_PUBLIC_SITE_URL=https://shop.yourdomain.com
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

**Note:** `NEXT_PUBLIC_` variables are visible to the browser. `DATABASE_URL` and secrets are private.

### 4. Deploy

Click "Deploy". Vercel will build and deploy automatically.

### 5. Run Migrations

After the first deploy, run migrations against production:

```bash
DATABASE_URL="postgres://..." npm run db:migrate
```

Use the exact connection string from your Neon/Supabase dashboard (with `?sslmode=require`).

### 6. Create Production Admin Account

```bash
DATABASE_URL="postgres://..." ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword npm run admin:create
```

Non-interactively, or run locally with `npm run admin:create` and provide the email/password when prompted.

### 7. Implement S3 Storage

Vercel's filesystem is ephemeral — files written to `public/uploads/` will disappear after a redeploy.

**Before your first image upload, implement S3:**

1. Update `src/lib/storage.ts` to import from `s3.ts` instead of `local.ts`
2. Implement `src/lib/storage/s3.ts` using your S3-compatible service:
   - AWS S3
   - Cloudflare R2
   - Supabase Storage
   - MinIO (self-hosted)

Example for Cloudflare R2:

```typescript
// src/lib/storage/s3.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT,
})

export async function uploadImage(filename: string, buffer: Buffer): Promise<string> {
  const key = `products/${Date.now()}-${filename}`
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
  }))
  
  return `${process.env.S3_URL}/${key}`
}
```

3. Add S3 env vars to Vercel settings
4. Test image upload in production

If you deploy without implementing S3, the `local.ts` stub will throw an error on the first upload attempt.

### Troubleshooting

**"Deployment failed: Command 'npm run build' failed"**
- Check that TypeScript types are correct: `npm run build` locally first
- Verify all env vars are set in Vercel

**"Database connection failed"**
- Confirm `DATABASE_URL` includes `?sslmode=require`
- Test the connection string locally

**"Cannot find module 's3.ts'"**
- Ensure `src/lib/storage.ts` imports from the right path
- Run `npm install @aws-sdk/client-s3` if using AWS SDK

## Railway

### 1. Push to GitHub

See Vercel step 1 above.

### 2. Create a PostgreSQL Service

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL service
4. Copy the connection string (`DATABASE_URL`)

### 3. Deploy the App

1. Add a new service (Node.js)
2. Select your GitHub repo
3. Set the `start` command to `npm run start`
4. Add env vars from `.env.example`
5. Deploy

### 4. Connect the Database

1. Go to your Node app in Railway
2. Add the PostgreSQL service as a variable reference
3. Set `DATABASE_URL` to the PostgreSQL connection string
4. Redeploy

### 5. Run Migrations

```bash
DATABASE_URL="postgres://..." npm run db:migrate
DATABASE_URL="postgres://..." npm run admin:create
```

### 6. Persistent Storage

Mount a volume at `public/uploads` so images survive redeploys:

1. In Railway, add a volume to your app
2. Mount it at `/app/public/uploads`
3. Rebuild

Or implement S3 storage (same as Vercel).

### 7. Domain

1. Add a domain in Railway project settings
2. Update `NEXT_PUBLIC_SITE_URL` to your domain
3. Redeploy

## Self-Hosted (VPS / Server)

### 1. Prerequisites

- Ubuntu/Debian server with SSH access
- Node.js 20+
- PostgreSQL 14+ (or separate managed service)
- Nginx or Apache (reverse proxy)
- SSL certificate (Let's Encrypt via Certbot)

### 2. Clone and Install

```bash
ssh user@server
cd /var/www/shop
git clone https://github.com/yourusername/shop.git .
npm ci
```

### 3. Environment Variables

```bash
nano .env.local
```

Fill in all variables. Example:

```
DATABASE_URL=postgres://localhost:5432/shop
ADMIN_SESSION_SECRET=[random]
CUSTOMER_SESSION_SECRET=[random]
SMTP_URL=smtp://localhost:1025
SMTP_FROM_EMAIL=orders@yourdomain.com
NEXT_PUBLIC_SITE_URL=https://shop.yourdomain.com
NODE_ENV=production
```

### 4. Build

```bash
npm run build
```

### 5. Persistent Storage

Create a volume for images:

```bash
mkdir -p /var/www/shop/public/uploads
chown node:node /var/www/shop/public/uploads
chmod 755 /var/www/shop/public/uploads
```

### 6. Run Migrations

```bash
npm run db:migrate
npm run admin:create
```

### 7. Start the Server

Use PM2 or systemd to manage the process.

**With PM2:**

```bash
npm install -g pm2
pm2 start npm --name shop -- run start
pm2 save
pm2 startup
```

**With systemd:**

Create `/etc/systemd/system/shop.service`:

```ini
[Unit]
Description=Shop
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/var/www/shop
ExecStart=/usr/bin/npm run start
Restart=always
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl enable shop
systemctl start shop
```

### 8. Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/shop`:

```nginx
server {
    listen 80;
    server_name shop.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name shop.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/shop.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shop.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/shop /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 9. SSL Certificate

Use Certbot for Let's Encrypt:

```bash
apt install certbot python3-certbot-nginx
certbot certonly --standalone -d shop.yourdomain.com
```

### 10. Backups

Set up automated PostgreSQL backups:

```bash
pg_dump dbname | gzip > /backups/shop-$(date +%Y-%m-%d).sql.gz
```

Add to crontab (`crontab -e`):

```
0 2 * * * pg_dump dbname | gzip > /backups/shop-$(date +\%Y-\%m-\%d).sql.gz
```

## Database Providers

### Neon (Recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project
3. Copy the connection string with `?sslmode=require`
4. Use as `DATABASE_URL`

**Pros:** Free tier, auto-scaling, branching
**Cons:** Managed service (less control)

### Supabase

1. Sign up at [supabase.com](https://supabase.com)
2. Create a project
3. Go to Settings → Database → Connection String
4. Copy the PostgreSQL URL

**Pros:** Full Postgres + auth + storage + realtime
**Cons:** Pricier at scale

### Railway

1. Create a PostgreSQL service in Railway
2. Copy the connection string
3. Use as `DATABASE_URL`

**Pros:** One dashboard for app + database
**Cons:** More expensive than standalone databases

### Self-Hosted PostgreSQL

Install on your server:

```bash
apt install postgresql-14
sudo -u postgres createdb shop
sudo -u postgres createuser shopuser
sudo -u postgres psql -c "ALTER USER shopuser WITH PASSWORD 'password';"
```

Connection string: `postgres://shopuser:password@localhost:5432/shop`

**Pros:** Full control, no recurring fees
**Cons:** Manual backups, updates, security

## Monitoring & Maintenance

### Logs

**Vercel:** Dashboard → Logs
**Railway:** Dashboard → Logs
**Self-hosted:** `systemctl logs -u shop -f` or `pm2 logs shop`

### Database

Check slow queries or dead rows:

```bash
npm run db:studio  # Opens Drizzle Studio
```

Or run raw SQL:

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('shop'));

-- Check top tables by size
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Updates

Keep dependencies current:

```bash
npm audit
npm update
npm run build
```

Deploy the changes.

## Troubleshooting

**"502 Bad Gateway"**
- App crashed or not listening on port 3000
- Check logs: `npm run logs` or `systemctl status shop`

**"Cannot connect to database"**
- Check `DATABASE_URL` and ensure `?sslmode=require` is present
- Verify network access (whitelisting for hosted DBs)

**"Images not uploading"**
- Implement S3 storage (local disk won't work on Vercel)
- Verify S3 credentials and bucket name

**"Out of memory"**
- Increase server RAM or enable Node memory compression
- Check for memory leaks in app: `node --inspect` + Chrome DevTools

---

Questions? Check **[SETUP.md](SETUP.md)** and **[ARCHITECTURE.md](ARCHITECTURE.md)** for more context.
