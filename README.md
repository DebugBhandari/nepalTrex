# NepalTrex

NepalTrex is a Nepal-focused trekking discovery and stay marketplace. Travellers can explore curated treks and nearby stays, while verified property partners manage room and food offers and respond to customer requests.

## Product direction

The product is being built around a dependable planning-to-stay journey:

1. Discover treks by region, duration, difficulty, and elevation.
2. Review route details, waypoints, nearby stays, and traveller reviews.
3. Browse trusted hotel, lodge, and homestay listings.
4. Request rooms and food from a stay.
5. Let the host accept, decline, or complete the request.
6. Keep both travellers and hosts informed through their dashboards.

The next domain evolution is dedicated date-based reservations with inventory and booking history. Generic menu orders are retained for food and legacy requests; they are not a substitute for accommodation inventory.

## Stack

- Next.js, React, and Material UI
- Nx workspace tooling
- PostgreSQL 16
- NextAuth credentials and Google sign-in
- Leaflet route and nearby-stay maps
- MinIO-compatible object storage for images
- GitHub Actions deployment to a VPS using PM2 and Nginx

## Local development

### Prerequisites

- Node.js `20.19.x`
- npm `10+`
- Docker and Docker Compose for local PostgreSQL and MinIO

### Start services and app

```bash
cp .env.example .env
docker compose up -d
npm ci
npm run migrate:db
npm run dev
```

The web application runs at `http://localhost:3000`.

### Useful commands

```bash
npm run build
npm run migrate:db
npm run seed:demo:stays
npm run seed:demo:reviews
```

## Database migrations

`db/init.sql` initializes a new local Docker volume and demo content. Production schema changes belong in ordered, immutable SQL files under `db/migrations`.

Run migrations with:

```bash
npm run migrate:db
```

The migration runner tracks each file and its SHA-256 checksum in `schema_migrations`. Never edit a migration after it has been deployed; create a later migration instead.

The runner serializes migrations with a PostgreSQL advisory lock and applies new migrations together with their migration record in one transaction. Do not put `BEGIN` or `COMMIT` inside new migration files. The first migration retains its original transaction wrapper for backward compatibility and is safely idempotent if an interrupted deployment needs to retry it.

The VPS deployment workflow runs migrations before rebuilding and restarting the Next.js application. A production database created before migrations existed must have the existing baseline schema applied before its first migration run.

## Marketplace rules

- The server, not the browser, is authoritative for menu-item names, prices, categories, availability, and stay ownership.
- New order records are linked to the authenticated purchaser through `customer_user_id`.
- Legacy email-based ownership remains supported only for historical order visibility.
- Room availability will move to a date-aware reservation and inventory model before accommodation booking is presented as confirmed.

## Deployment notes

- Configure `DATABASE_URL`, NextAuth settings, and MinIO credentials in the VPS environment secret.
- Do not expose PostgreSQL or MinIO administration ports publicly in production.
- Back up PostgreSQL before every schema migration and verify the deployed service health after each release.