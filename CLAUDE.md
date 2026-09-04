# CLAUDE.md — Freitty Client Cabinet

Test assignment: 3 screens of a logistics platform client cabinet (Dashboard, Order List, Order Detail), backend + frontend, deployed and presented live. Source code is not submitted — the deployed app and the walkthrough are what get evaluated.

## Read these before starting any task

| File | What it is | When you need it |
|---|---|---|
| `PROGRESS.md` | Current stage, checklist, cutting line | **Always — first thing in a new session** |
| `docs/DECISIONS.md` | Locked decisions + rationale | Before any domain or architecture choice |
| `docs/data-model.md` | Prisma schema + exact seed spec | Stage 1 (schema, seed) |
| `docs/api-contract.md` | Endpoints, query params, response shapes | Stage 2 (services, routes) and any UI work |
| `docs/mockup.html` | The original wireframe — open it, the CSS has exact spacing and colors | Stages 3–6 (all UI) |
| `docs/task.md` | Original assignment + extracted domain | Context / scope questions |

**Never invent a domain rule.** If something is ambiguous (a status, a counter, a filter interaction), the answer is in `docs/DECISIONS.md` section B. If it genuinely is not there, ask instead of guessing — the mockup has known internal contradictions and guessing will produce numbers that do not add up.

## Stack

- **Next.js 15 (App Router) + TypeScript strict** — one codebase for API and UI
- **PostgreSQL on Supabase** + **Prisma** ORM (plain Prisma connection — the Supabase SDK, Auth, Storage and Realtime are deliberately NOT used)
- **Tailwind CSS** for styling, **Recharts** for the activity charts
- **Zod** for validating every external input
- **Vitest** for unit tests on pure functions
- **Vercel** for deployment

## Database connection

Supabase exposes two different URLs; mixing them up is the most common cause of "works locally, fails on Vercel":

```env
# Runtime — Supavisor transaction pooler, port 6543
DATABASE_URL="postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Migrations — session pooler, port 5432
DIRECT_URL="postgresql://...@...pooler.supabase.com:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- Runtime goes through the **transaction pooler**: serverless functions are short-lived and exhaust direct connections.
- Migrations need **session mode** — prepared statements do not work under transaction pooling.
- For `DIRECT_URL` use the **session pooler on 5432**, not the `db.xxx.supabase.co` host: direct connections on the free tier are IPv6-only and Vercel is IPv4. Symptom of getting this wrong: `prisma migrate` hangs with no error.
- Free tier pauses the project after ~a week of inactivity and does **not** resume automatically.

## Commands

```bash
npm run dev              # dev server
npm run build            # production build — must pass before every deploy
npm test                 # vitest
npx tsc --noEmit         # type check
npx prisma migrate dev   # create + apply a migration (never `db push` on main)
npx prisma db seed       # reseed — deterministic, ends with assertions
npx prisma studio        # inspect data
```

## Architecture

Three layers, strictly one-directional: **route handler / page → service → Prisma**.

```
src/
  app/
    global-error.tsx                   # last resort — catches layout failures
    (cabinet)/layout.tsx                 # sidebar + topbar + breadcrumbs
    (cabinet)/error.tsx                  # segment error boundary
    (cabinet)/not-found.tsx              # notFound() target
    (cabinet)/(overview)/page.tsx        # Dashboard          → /
    (cabinet)/(overview)/loading.tsx     # skeleton, dashboard only
    (cabinet)/orders/(list)/page.tsx     # Order List         → /orders
    (cabinet)/orders/(list)/loading.tsx  # skeleton, list only
    (cabinet)/orders/[number]/page.tsx   # Order Detail       → /orders/FR001383
    (cabinet)/orders/[number]/not-found.tsx
    api/health/route.ts
    api/orders/route.ts
    api/orders/[number]/route.ts
    api/orders/export/route.ts
    api/dashboard/summary/route.ts
  server/                              # every file starts with `import "server-only"`
    db/prisma.ts                       # PrismaClient singleton
    services/orders.service.ts         # ALL order business logic
    services/dashboard.service.ts      # KPI + aggregation (raw SQL)
    services/users.service.ts          # who the top bar renders (no auth — the ADMIN row)
    dto/orders.dto.ts                  # zod schemas + Prisma → API mappers
  lib/
    filters.ts                         # pure: query params → Prisma `where`
    week.ts                            # pure: ISO week bucketing
    status.ts                          # pure: (status, type) → UI label
    format.ts                          # pure: date / money / quantity
    csv.ts                             # pure: CSV quoting + formula-injection guard
    query.ts                           # pure: searchParams → zod input
  components/
    ui/                                # generic atoms
    orders/                            # domain components
```

Rules:
- **Business logic never lives in a route handler or a page.** Handlers parse input, call a service, return JSON.
- **Server Components call services directly** (no HTTP hop to our own API). Client-side interactions (filters, pagination, view toggle) go through the REST API.
- Both paths call the **same service function** — no duplicated logic. This is the architecture's central invariant.
- `src/server/**` is server-only, enforced by `import "server-only"` at the top of every file
  there — importing it from a `"use client"` component fails the build instead of bundling
  Prisma into the browser. Type-only imports (`import type`) are erased and stay legal.
- Anything that can be a pure function in `src/lib/**` should be — that is what gets tested.
- `"use client"` goes on the smallest possible component (a filter bar, a chart), never on a page.

## Conventions

- No `any`. Derive types from Prisma or from a zod schema (`z.infer`).
- Every external input is parsed with zod at the boundary. Invalid input → `400` with `{ error: { code, message } }`.
- `export const dynamic = 'force-dynamic'` on every query-dependent route and page.
- API responses use **plain JSON types**: `Decimal` → `number`, `Date` → ISO string. Done in the DTO mapper, never in a component.
- Money is `Decimal(12, 2)` in Postgres. Never `Float`. Computed totals (`lineTotal`, `subtotal`) are calculated, never stored.
- Timestamps stored in UTC; formatting only in `lib/format.ts`. **Never `setHours`/`getHours`
  anywhere** — including the seed. Use `Date.UTC` / `getUTC*`, or the data silently depends on
  the timezone of whichever machine wrote it.
- Raw SQL over a `timestamp` column must not wrap it in `AT TIME ZONE 'UTC'` — that casts it to
  `timestamptz` and makes `date_trunc` follow the session timezone (see `DECISIONS.md` B10).
- Every list query needs a unique tiebreaker in `orderBy`, or offset pagination is unstable.
- Every `catch` logs with `console.error` before returning an error response.
- Filters and pagination live in **URL searchParams**, not in `useState`.
- Aggregations computed **in the database** (`count`, `groupBy`, or `date_trunc` raw query), never by fetching rows and reducing in JS.
- Empty time buckets are filled with zeros on the backend — `GROUP BY` returns no rows for empty groups and the chart would jump.
- Missing entity → `notFound()` on a page, `404` from an API route.
- **No `loading.tsx` above `orders/[number]`.** A Suspense boundary over a page lets the shell
  flush with HTTP 200 before the page can call `notFound()`, so a missing order answered 200.
  That is why the two list screens keep their skeletons inside route groups — see
  `components/ui/PageSkeleton.tsx`.
- Component files: PascalCase. Everything else: kebab-case.

## Testing

Unit tests on pure functions only — no test database, no Prisma in tests:
- `buildOrdersWhere(filters)` including combined tab + hub + status
- `getWeekBucket` boundaries and range edges
- `getStatusLabel(status, type)` mapping incl. the alert override
- trend calculation and Supplies `lineTotal`

Integration tests against Prisma are deliberately out of scope (separate infrastructure: test DB + isolation).

## Data rules

- **Nothing on the frontend is hardcoded.** Every number, badge and row comes from the API. If a screen renders a constant, that is a bug.
- The seed uses a **fixed random seed** and ends with assertions on the control numbers in `docs/data-model.md` §2.5. If the numbers do not match, the seed must fail loudly.
- Mockup dates are stored as **relative offsets from seed time**, not absolute dates, so the app does not go stale.

## Out of scope (deliberate — do not add)

Auth, mutations (create/edit order, add operation/supply), file uploads, chat, notifications, BOL PDF, drag-and-drop pipeline, `day`/`quarter` granularity. Read-only cabinet only. Controls shown in the mockup but not implemented render as `disabled` with `title="Out of scope"` — never fake the behaviour.

## Definition of done for any task

1. `npx tsc --noEmit`, `npm test` and `npm run build` pass
2. The screen renders real data from Postgres
3. Loading, empty and error states exist
4. Layout is close to `docs/mockup.html` (pixel-perfect not required)
5. `PROGRESS.md` updated: current stage line + the stage's checklist
