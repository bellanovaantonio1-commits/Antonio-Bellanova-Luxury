# Antonio Bellanova Luxury

Production-ready luxury e-commerce platform for watches and jewelry with ERP, CRM, AI import, and admin dashboard.

## Features

- **Shop**: Product catalog, search, cart, checkout (bank transfer)
- **Admin**: Products, AI Import (TS-Trading + Gemini), orders, inventory, CRM, settings
- **Forms**: Contact and sell/consignment inquiries stored in database
- **Auth**: Firebase Google Sign-In with role-based admin access

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Firebase project (configured via `firebase-applet-config.json`)
- Gemini API key (for AI Import)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in `SQL_*`, `GEMINI_API_KEY`, and other values.

3. Run database migration:
   ```bash
   npm run db:migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Admin Access

Sign in with Google using the admin email configured in `firestore.rules` and `server.ts` sync logic.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Express + Vite) |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run db:migrate` | Create/update database tables |
| `npm run lint` | TypeScript check |

## Payment

Checkout creates an order with status `PENDING` and payment via bank transfer. Bank details are configurable in Admin → Einstellungen.

## Online stellen (Deployment)

Empfohlen: **Render.com** (kostenlos) + **Neon.tech** (kostenlose PostgreSQL).

### Schritt 1: Datenbank (Neon)

1. Gehe zu [neon.tech](https://neon.tech) und erstelle ein kostenloses Projekt
2. Kopiere den **Connection String** (`postgresql://...`)
3. Das ist dein `DATABASE_URL`

### Schritt 2: Code auf GitHub

```bash
git init
git add .
git commit -m "Deploy Antonio Bellanova Luxury"
# Neues Repo auf GitHub erstellen, dann:
git remote add origin https://github.com/DEIN-USER/DEIN-REPO.git
git push -u origin main
```

### Schritt 3: Render deployen

1. [render.com](https://render.com) → **New +** → **Blueprint** (oder Web Service)
2. GitHub-Repo verbinden
3. Environment Variables setzen:
   - `DATABASE_URL` = Neon Connection String
   - `GEMINI_API_KEY` = dein Gemini Key
   - `NODE_ENV` = `production`
   - `APP_URL` = deine Render-URL (z. B. `https://antonio-bellanova-luxury.onrender.com`)
4. Deploy starten — Migration läuft automatisch (`releaseCommand`)

### Schritt 4: Firebase anpassen

In [Firebase Console](https://console.firebase.google.com/project/eastern-object-tk8sk/authentication/settings):

- **Authorized domains** → deine Render-URL hinzufügen (z. B. `antonio-bellanova-luxury.onrender.com`)
- In [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=eastern-object-tk8sk):
  - **Authorized JavaScript origins**: `https://deine-app.onrender.com`

### Alternative: AI Studio

Das Projekt stammt aus AI Studio — dort kann die App auch direkt gehostet werden:
https://ai.studio/apps/8a4807fa-64cf-49ab-b51f-d650f087509b
