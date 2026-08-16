# Deployment Checklist — Antonio Bellanova Luxury

## Required environment variables (Render)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `APP_URL` | Production URL, e.g. `https://antonio-bellanova-luxury.onrender.com` |

## Recommended

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Order & certificate emails |
| `EMAIL_FROM` | Sender address for Resend |
| `STRIPE_SECRET_KEY` | Online card payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe payment confirmation |
| `GEMINI_API_KEY` | AI product import |
| `ADMIN_EMAILS` | Comma-separated admin Google accounts |

## Firebase

1. Add production domain under **Authentication → Settings → Authorized domains**
2. Keep `firebase-applet-config.json` in the repo (or configure via env if you migrate)

## Stripe webhook

Production endpoint:

```
https://YOUR-DOMAIN.onrender.com/api/stripe/webhook
```

Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

Enable PayPal, Klarna, Apple Pay, Google Pay in Stripe Dashboard → Payment methods.

## After deploy

1. Open `/api/health` — `db: connected`, ideally `email: true`, `stripe: true`
2. Test shop, cart, login, admin
3. Admin → Echtheitszertifikate → **Alle Snapshots aktualisieren** (once, for old certificates)
4. Admin → Einstellungen: bank details, contact, Instagram/Facebook URLs

## Local readiness check

```bash
npm run test:deploy
```
