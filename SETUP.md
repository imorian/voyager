# Setup Guide — Overseas Business Travel Expense System

## Prerequisites

Install [Node.js 20+](https://nodejs.org) (LTS) before running any commands.

---

## 1. Supabase Project

1. Create a free project at [supabase.com](https://supabase.com)
2. In **Project Settings → API**, copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (⚠ keep secret)
3. In **Project Settings → Database**, copy the connection strings:
   - **Connection pooling (port 6543)** → `DATABASE_URL`
   - **Direct connection (port 5432)** → `DIRECT_URL`
4. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` as a redirect URL
5. In **Storage**, create a bucket called `receipts` (private) and one called `pdfs` (private)

---

## 2. Resend (Email)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key → `RESEND_API_KEY`
3. Add and verify your domain, set `RESEND_FROM_EMAIL`

---

## 3. Environment Variables

Edit `.env.local` with your real values:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourcompany.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
SEED_ADMIN_EMAIL=your-admin@yourcompany.com
NEXT_PUBLIC_COMPANY_NAME=Americas IT
```

---

## 4. Install & Run

```bash
npm install
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to Supabase
npm run db:seed         # Seed per diem rates + admin user
npm run dev             # Start dev server at http://localhost:3000
```

---

## 5. First Login

1. Go to `http://localhost:3000/login`
2. Enter `SEED_ADMIN_EMAIL` and click **Send magic link**
3. Check email and click the link
4. You're now logged in as Admin

---

## 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

vercel
# Follow prompts, then add env vars in Vercel dashboard
```

In Vercel dashboard → Settings → Environment Variables, add all vars from `.env.local`.

Change `NEXT_PUBLIC_APP_URL` to your Vercel URL, and add it as a redirect URL in Supabase Auth.

---

## Key User Flows

| Action | Path |
|---|---|
| New trip | Dashboard → **New Pre-Trip** |
| Approve/reject | `/approvals` (Manager/Admin) |
| Download PDF | Dashboard or `/forms/[id]/pdf` (after Post-Trip approved) |
| Manage users | `/admin/users` (Admin only) |
| Update per diem rates | `/admin/rates` (Admin only) |
