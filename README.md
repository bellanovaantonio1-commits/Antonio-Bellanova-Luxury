# Antonio Bellanova Luxury

Production-ready luxury e-commerce platform for watches and jewelry with ERP, CRM, AI import, certificates, invoices, and admin dashboard.

## Features

- **Shop**: Product catalog, search, filters, cart, Stripe + bank transfer checkout
- **Product page**: Gallery, similar products, datasheet PDF, payment methods, mobile buy bar
- **Certificates**: Digital authenticity certificates with verification, PDF, all product images
- **Invoices**: Automatic invoice PDFs for orders
- **Admin**: Products, AI import, orders, certificates, invoices, CRM, pricing — **mobile-friendly drawer**
- **Auth**: Firebase Google Sign-In with role-based admin access

## Prerequisites

- Node.js 20+
- PostgreSQL (Neon recommended)
- Firebase project
- Optional: Resend (email), Stripe (payments), Gemini (AI import)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env — at minimum DATABASE_URL or SQL_* and APP_URL
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Express + Vite) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run db:migrate` | Database migrations |
| `npm run db:seed` | Demo data |
| `npm run lint` | TypeScript check |
| `npm run test:deploy` | Check env vars for production |
| `npm run test:certificates` | Certificate system smoke test |

## Payment

- **Bank transfer / prepayment** — configurable in Admin → Einstellungen
- **Stripe Checkout** — cards, Apple Pay, Google Pay, PayPal, Klarna (when enabled in Stripe Dashboard)

Set `STRIPE_SECRET_KEY` and configure webhook — see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Email

Order confirmations and certificate notifications use [Resend](https://resend.com). Set `RESEND_API_KEY` and `EMAIL_FROM`.

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for Render + Neon setup.

Push to `main` → Render auto-deploys.

## Admin

Sign in with a Google account listed in `ADMIN_EMAILS`. Admin works on desktop and mobile (hamburger menu).
