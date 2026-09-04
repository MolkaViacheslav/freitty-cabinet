# Freitty Client Cabinet

Test assignment: a read-only client cabinet for a logistics platform — three screens
(Dashboard, Order List, Order Detail), backed by a real Postgres database, deployed and
presented live.

**Live:** https://freitty-cabinet.vercel.app

## Stack

- **Next.js 15 (App Router) + TypeScript strict** — one codebase for API and UI, no separate backend
- **PostgreSQL on Supabase + Prisma** — plain Prisma connection; the Supabase SDK, Auth, Storage
  and Realtime are deliberately not used (no vendor lock-in)
- **Tailwind CSS** for styling, **Recharts** for the activity charts
- **Zod** for validating every external input
- **Vitest** for unit tests on pure functions
- **Vercel** for deployment

## Architecture

Three layers, strictly one-directional:

```
Route Handler (/api/orders)   ─┐
                                ├─→  orders.service.ts  ─→  Prisma  ─→  Postgres
Server Component (page.tsx)   ─┘        (all business logic)
```

Server Components call the service layer **directly** — no HTTP round-trip to the app's own
API. Client-side interactions (filters, pagination, the Cards/Table switch) go through the
same REST endpoints a browser or another client could call. Both paths share one service
function, so there is no duplicated logic between them.

Every non-trivial decision — why Postgres over the Supabase SDK, why status/quantity rules
work the way they do, why some navigation uses full `<a>` links instead of `<Link>` — is
recorded with its rationale in **[docs/DECISIONS.md](docs/DECISIONS.md)**.

## Running locally

### 1. Install

```bash
npm install
```

### 2. Database

Create a Postgres database (a free [Supabase](https://supabase.com) project works well — see
the note on its two connection strings below). Copy `.env.example` to `.env.local` and fill in
both URLs from your project's connection settings:

```bash
cp .env.example .env.local
```

```env
# Runtime — transaction pooler, port 6543
DATABASE_URL="postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Migrations — session pooler, port 5432
DIRECT_URL="postgresql://...@...pooler.supabase.com:5432/postgres"
```

On Supabase specifically, the two URLs are not interchangeable: runtime queries go through the
**transaction pooler** (serverless functions are short-lived), while `prisma migrate` needs the
**session pooler** on 5432, because prepared statements don't work under transaction pooling.
Using the direct `db.xxx.supabase.co` host for `DIRECT_URL` also fails on Vercel — that host is
IPv6-only on the free tier and Vercel is IPv4, which makes `prisma migrate` hang with no error.

### 3. Migrate and seed

```bash
npx prisma migrate dev
npx prisma db seed
```

The seed is deterministic (fixed random seed) and ends with assertions on a set of control
numbers — if it doesn't print all green, something is wrong before the app ever runs. It
generates 6 users, 2 hubs, 72 orders (cross-dock and consolidation) with sub-orders,
operations and supplies, dated as relative offsets from seed time so the app never looks stale.

### 4. Run

```bash
npm run dev
```

http://localhost:3000 — Dashboard, Order List (`/orders`) and Order Detail
(`/orders/<number>`, e.g. any number `prisma studio` shows you).

## Commands

```bash
npm run dev              # dev server
npm run build            # production build
npm test                 # vitest — unit tests on pure functions only, no test database
npx tsc --noEmit         # type check
npx eslint src            # lint
npx prisma migrate dev   # create + apply a migration
npx prisma db seed       # reseed (deterministic, asserts its own control numbers)
npx prisma studio        # inspect data
```

## Notes

- **Read-only.** Auth, mutations (create/edit order, add operation/supply), file uploads and a
  few other mockup controls are deliberately out of scope — see `CLAUDE.md` for the full list.
  Everything out of scope renders as a real, visibly disabled control (`title="Out of scope"`)
  rather than being silently dropped or faked.
- **Nothing on the frontend is hardcoded.** Every number, badge and row comes from the database
  through the service layer.
- Supabase's free tier pauses a project after about a week of inactivity and does not resume on
  its own — if the live link answers slowly or with an error, it likely needs a manual restore
  from the Supabase dashboard.
