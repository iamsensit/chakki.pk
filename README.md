# Chakki.pk — Next.js 14 Wholesale eCommerce

Production-ready scaffold for a wholesale-first eCommerce (grains & essentials) built on Next.js 14 (App Router), Tailwind, Zod, Zustand, NextAuth, and MongoDB (Mongoose).

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- NextAuth (Google + Credentials)
- Zod (validation)
- Zustand (client state)

## Getting Started

1. Install deps
```bash
npm install
```

2. Environment
- Create `.env.local` and set:
```
MONGODB_URI=your_mongodb_connection
MONGODB_DB=chakki_pk
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3. Seed dummy data
```bash
npm run seed
```

4. Dev
```bash
npm run dev
```
Open http://localhost:3000

## Features
- Products API with filters, sort, pagination (Mongoose)
- Product detail API
- Cart API (server sync for logged-in users; guest cart localStorage)
- Orders API with COD rules (first COD free, configurable fee)
- JazzCash simulated payment endpoints
- Admin analytics endpoint
- Seed script creating 40 products with variants & price tiers (Mongo)

## Deployment (Vercel)
- Add env vars in Vercel project settings:
  - `MONGODB_URI`, `MONGODB_DB`
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `COD_FREE_DELIVERY_FIRST_ORDER`, `COD_DEFAULT_DELIVERY_FEE`

## Notes
- API responses are standardized: `{ success, message, data?, errors? }`
- CORS headers enabled for `/api/*` (for future mobile app)
