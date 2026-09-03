// Deterministic seed — source of truth: docs/data-model.md §2.
// Re-running produces the same counts, tab breakdown, and assertion results every time
// (absolute dates shift with `T`, but every relative offset and random draw is fixed).

import { PrismaClient, OrderType, OrderStatus, PalletUnit, OperationType, Role } from "@prisma/client";
import { getWeekBucketRange, WEEK_BUCKET_COUNT } from "../src/lib/week";

const prisma = new PrismaClient();

// T = seed run time. Every other date is a relative offset from T (CLAUDE.md: "mockup dates
// are relative offsets from seed time, not absolute dates").
const T = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) — fixed seed = 20260403 (the mockup's "12 Apr" as a number).
// No Math.random() anywhere below this line.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let s = seed;
  return function rand() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260403);
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round((rand() * (max - min) + min) * f) / f;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function chance(p: number): boolean {
  return rand() < p;
}

// ---------------------------------------------------------------------------
// Time helpers — UTC, deliberately.
//
// Everything that reads this data works in UTC: lib/week.ts buckets on UTC ISO weeks,
// lib/filters.ts derives period cutoffs with Date.UTC, lib/format.ts renders with getUTC*, and
// date_trunc runs on `timestamp` columns holding UTC wall-clock time. Using setHours() here would
// stamp the *seeding machine's* local time, so a seed run from UTC+3 would store the mockup's
// "12 Apr, 09:00" as 06:00Z and every screen would render it three hours early.
// ---------------------------------------------------------------------------
const HOUR_MS = 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function daysAgo(days: number, hour = 9, minute = 0): Date {
  const dayStart = startOfUtcDay(new Date(T.getTime() - days * DAY_MS));
  return new Date(dayStart.getTime() + hour * HOUR_MS + minute * 60 * 1000);
}
function atTime(date: Date, hour: number, minute: number): Date {
  return new Date(startOfUtcDay(date).getTime() + hour * HOUR_MS + minute * 60 * 1000);
}

const { start: currentWeekStart } = getWeekBucketRange(WEEK_BUCKET_COUNT, T);
const { start: w7Start, end: w7End } = getWeekBucketRange(7, T);
function inW7(date: Date): boolean {
  return date.getTime() >= w7Start.getTime() && date.getTime() <= w7End.getTime();
}
function createdAtInCurrentWeek(): Date {
  return new Date(currentWeekStart.getTime() + randInt(0, Math.max(0, T.getTime() - currentWeekStart.getTime())));
}
function createdAtOutsideCurrentWeek(candidate: Date): Date {
  if (candidate.getTime() < currentWeekStart.getTime()) return candidate;
  return new Date(currentWeekStart.getTime() - randInt(1, 5) * DAY_MS);
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const SUPPLY_CATALOG: { sku: string; category: string; unitPrice: number }[] = [
  { sku: "Straps 12", category: "Securement", unitPrice: 4.5 },
  { sku: "Corners 50", category: "Edge protect", unitPrice: 1.2 },
  { sku: "Shrink wrap 120g", category: "Wrap", unitPrice: 18.0 },
  { sku: "Straps 15", category: "Securement", unitPrice: 5.75 },
  { sku: "Straps 20", category: "Securement", unitPrice: 7.9 },
  { sku: "Ratchet straps 2in", category: "Securement", unitPrice: 22.0 },
  { sku: "Corner boards 2in", category: "Edge protect", unitPrice: 2.1 },
  { sku: "Corner boards 3in", category: "Edge protect", unitPrice: 2.85 },
  { sku: "Edge guards", category: "Edge protect", unitPrice: 3.4 },
  { sku: "Shrink wrap 80g", category: "Wrap", unitPrice: 12.5 },
  { sku: "Stretch film 17in", category: "Wrap", unitPrice: 9.25 },
  { sku: "Pallet cap sheets", category: "Wrap", unitPrice: 0.8 },
  { sku: "Barcode labels 4x6", category: "Labeling", unitPrice: 6.0 },
  { sku: "Hazmat labels", category: "Labeling", unitPrice: 8.5 },
  { sku: "Fragile labels", category: "Labeling", unitPrice: 3.15 },
  { sku: "Shipping labels roll", category: "Labeling", unitPrice: 14.0 },
];

const CARRIERS = [
  "Schneider",
  "TForce",
  "Day & Ross",
  "Manitoulin Transport",
  "XPO Logistics",
  "Self pickup",
  "R-way Transport Inc.",
  "Bison Transport",
];
const CITIES = [
  "Toronto, ON",
  "Calgary, AB",
  "Detroit, MI",
  "Brampton, ON",
  "Ottawa, ON",
  "Montreal, QC",
  "Chicago, IL",
  "Buffalo, NY",
  "Vancouver, BC",
  "Winnipeg, MB",
];
const SERVICES = ["Storage", "Pickup", "Transload", "Restock & Rework"];
const CUSTOMERS = [
  "R-way Transport",
  "Northgate Distribution",
  "Maple Freight Co.",
  "Lakeside Logistics",
  "Trans-Ontario Supply",
  "Harborview Imports",
];
const ALERT_MESSAGES = ["photo missing", "BOL mismatch", "damaged pallet reported", "qty discrepancy"];
const NEXT_ACTIONS = [
  "Waiting for truck",
  "Loading · 1h 05m",
  "Loading · 2h 14m",
  "Awaiting dispatch",
  "Ready for pickup",
  "Unloading in progress",
  "Staged for consolidation",
];

// ---------------------------------------------------------------------------
// Money — DECISIONS.md B9. W7 gets the upper third of the range (data-model.md §2.6).
// ---------------------------------------------------------------------------
function amountFor(type: OrderType, closedAt: Date | null): number {
  const [lo, hi] = type === OrderType.CROSS_DOCK ? [180, 900] : [400, 2400];
  if (closedAt && inW7(closedAt)) {
    return randFloat(lo + (hi - lo) * (2 / 3), hi);
  }
  return randFloat(lo, hi);
}

// ---------------------------------------------------------------------------
// Cargo / transport / warehouse field generators for non-named orders
// ---------------------------------------------------------------------------
function buildCargo(isClosed: boolean) {
  const unit = chance(0.85) ? PalletUnit.STANDARD : PalletUnit.XL;
  const declaredQty = randInt(5, 30);
  const xlQty = unit === PalletUnit.STANDARD && chance(0.25) ? randInt(1, 5) : 0;
  const actualQty = isClosed
    ? chance(0.85)
      ? declaredQty + pick([0, 0, 0, -1, 1, -2, 2])
      : undefined
    : chance(0.2)
      ? declaredQty + pick([0, -1, 1])
      : undefined;
  return { unit, declaredQty, xlQty, actualQty };
}
function buildTransport() {
  return {
    carrierName: pick(CARRIERS),
    truckNumber: chance(0.6) ? `TRK-${randInt(1000, 9999)}` : undefined,
    trailerNumber: chance(0.6) ? `TRL-${randInt(1000, 9999)}` : undefined,
    dock: chance(0.4) ? `Dock ${randInt(1, 20)} · Bay ${pick(["A", "B", "C", "D"])}` : undefined,
    trailersCount: chance(0.25) ? randInt(1, 3) : 0,
    carrierPhone: chance(0.35) ? `+1 ${randInt(200, 999)} 555 ${String(randInt(0, 9999)).padStart(4, "0")}` : undefined,
  };
}
function buildWarehouseMeta() {
  return {
    photosCount: randInt(0, 5),
    photosLimit: pick([0, 5]),
    commentsCount: randInt(0, 3),
  };
}
function buildNextAction(status: OrderStatus): string | undefined {
  if (status === OrderStatus.CLOSED || status === OrderStatus.DRAFT) return undefined;
  return pick(NEXT_ACTIONS);
}
function buildOperations(scheduledAt: Date, count: number) {
  const ops = [];
  for (let i = 0; i < count; i++) {
    ops.push({
      type: pick([OperationType.UNLOADING, OperationType.DISPOSAL, OperationType.RESTACK, OperationType.LOADING]),
      trailerNumber: chance(0.5) ? `TRL-${randInt(1000, 9999)}` : undefined,
      qty: randInt(1, 30),
      unit: chance(0.85) ? PalletUnit.STANDARD : PalletUnit.XL,
      appliedAt: new Date(scheduledAt.getTime() + (i + 1) * 40 * 60 * 1000),
      commentsCount: randInt(0, 2),
      photosCount: randInt(0, 5),
      isBillable: chance(0.4),
    });
  }
  return ops;
}
function buildSupplies() {
  const count = randInt(1, 4);
  const usedIdx = new Set<number>();
  while (usedIdx.size < count) usedIdx.add(randInt(0, SUPPLY_CATALOG.length - 1));
  return [...usedIdx].map((idx) => {
    const item = SUPPLY_CATALOG[idx];
    return { sku: item.sku, category: item.category, qty: randInt(1, 20), unitPrice: item.unitPrice };
  });
}
function buildSubOrders(orderNumber: string, count: number) {
  const arr = [];
  for (let i = 1; i <= count; i++) {
    arr.push({ code: `${orderNumber}-${i}`, refNumber: `REF-${randInt(2000, 9999)}`, pallets: randInt(4, 20) });
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Order spec — an in-memory description of one order before it's written to the DB
// ---------------------------------------------------------------------------
type OrderSpec = {
  number: string;
  type: OrderType;
  status: OrderStatus;
  hubId: string;
  scheduledAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  hasAlert?: boolean;
  alertMessage?: string;
  awaitingClientAction?: boolean;
  refNumber?: string;
  service?: string;
  customer?: string;
  destination?: string;
  declaredQty: number;
  actualQty?: number;
  unit?: PalletUnit;
  xlQty?: number;
  carrierName?: string;
  driverName?: string;
  carrierPhone?: string;
  truckNumber?: string;
  trailerNumber?: string;
  dock?: string;
  trailersCount?: number;
  warehouseNote?: string;
  photosCount?: number;
  photosLimit?: number;
  commentsCount?: number;
  amount?: number | null;
  nextActionLabel?: string;
  createdById: string;
  assignedToId?: string;
  /** Mockup-specified order (data-model.md §2.7) — excluded from the W7 money-boost reshuffle. */
  locked?: boolean;
  subOrders?: { code: string; refNumber: string; pallets: number; hasAlert?: boolean; alertMessage?: string }[];
  operations?: {
    type: OperationType;
    trailerNumber?: string;
    qty: number;
    unit?: PalletUnit;
    appliedAt: Date;
    commentsCount?: number;
    photosCount?: number;
    isBillable?: boolean;
  }[];
  supplies?: { sku: string; category: string; qty: number; unitPrice: number }[];
};

// ---------------------------------------------------------------------------
// Assertions (data-model.md §2.5) — scoped exactly like the Order List's default view:
// tab counts (all/cross-dock/consolidation/alerts/drafts) only consider orders whose
// scheduledAt is within the last 30 days (DECISIONS.md B1/B2 — Group A).
// ---------------------------------------------------------------------------
const cutoff30 = new Date(T.getTime() - 30 * DAY_MS);
const cutoff60 = new Date(T.getTime() - 60 * DAY_MS);

async function countTabAll() {
  return prisma.order.count({ where: { scheduledAt: { gte: cutoff30 } } });
}
async function countTabCrossDock() {
  return prisma.order.count({
    where: { scheduledAt: { gte: cutoff30 }, type: OrderType.CROSS_DOCK, hasAlert: false, status: { not: OrderStatus.DRAFT } },
  });
}
async function countTabConsolidation() {
  return prisma.order.count({
    where: { scheduledAt: { gte: cutoff30 }, type: OrderType.CONSOLIDATION, hasAlert: false, status: { not: OrderStatus.DRAFT } },
  });
}
async function countTabAlerts() {
  return prisma.order.count({ where: { scheduledAt: { gte: cutoff30 }, hasAlert: true, status: { not: OrderStatus.DRAFT } } });
}
async function countTabDrafts() {
  return prisma.order.count({ where: { scheduledAt: { gte: cutoff30 }, status: OrderStatus.DRAFT } });
}
async function countActive() {
  return prisma.order.count({
    where: {
      status: {
        in: [OrderStatus.READY, OrderStatus.IN_PROGRESS, OrderStatus.CONSOLIDATED, OrderStatus.IN_TRANSIT, OrderStatus.DECONSOLIDATED],
      },
    },
  });
}
async function countCompletedLast30d() {
  return prisma.order.count({ where: { status: OrderStatus.CLOSED, closedAt: { gte: cutoff30 } } });
}
async function countCompletedPrev30d() {
  return prisma.order.count({ where: { status: OrderStatus.CLOSED, closedAt: { gte: cutoff60, lt: cutoff30 } } });
}
/** Mirrors dashboard.service.ts getNeedAttentionKpi exactly: whole DB (no 30-day window,
 * DECISIONS.md B5) but drafts excluded, like the Alerts tab. */
async function countNeedAttention() {
  return prisma.order.count({
    where: { status: { not: OrderStatus.DRAFT }, OR: [{ hasAlert: true }, { awaitingClientAction: true }] },
  });
}

/**
 * Invariants that no control number would catch. These are the ones a reviewer notices by eye on
 * Order Detail — an order closed before it was scheduled, or closed in the future.
 */
async function countClosedBeforeScheduled() {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "orders" WHERE "closedAt" IS NOT NULL AND "closedAt" < "scheduledAt"
  `;
  return Number(rows[0].n);
}
async function countClosedInFuture() {
  return prisma.order.count({ where: { closedAt: { gt: T } } });
}
async function countClosedWithoutDate() {
  return prisma.order.count({ where: { status: OrderStatus.CLOSED, closedAt: null } });
}

async function runAssertions() {
  const checks: [string, number, number][] = [
    ["countAll", await prisma.order.count(), 72],
    ["countTab(all)", await countTabAll(), 27],
    ["countTab(cross-dock)", await countTabCrossDock(), 18],
    ["countTab(consolidation)", await countTabConsolidation(), 6],
    ["countTab(alerts)", await countTabAlerts(), 2],
    ["countTab(drafts)", await countTabDrafts(), 1],
    ["countActive", await countActive(), 7],
    ["countCompletedLast30d", await countCompletedLast30d(), 24],
    ["countCompletedPrev30d", await countCompletedPrev30d(), 20],
    ["countNeedAttention", await countNeedAttention(), 3],
    ["closedBeforeScheduled", await countClosedBeforeScheduled(), 0],
    ["closedInFuture", await countClosedInFuture(), 0],
    ["closedWithoutDate", await countClosedWithoutDate(), 0],
  ];

  for (const [label, actual, expected] of checks) {
    console.log(`${actual === expected ? "✅" : "❌"} ${label} = ${actual} (expected ${expected})`);
  }

  const failures = checks.filter(([, actual, expected]) => actual !== expected);
  if (failures.length > 0) {
    throw new Error(
      `Seed assertions failed:\n${failures.map(([label, actual, expected]) => `  - ${label}: expected ${expected}, got ${actual}`).join("\n")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Seeding with T = ${T.toISOString()} (rng seed = 20260403)`);

  await prisma.order.deleteMany();
  await prisma.hub.deleteMany();
  await prisma.user.deleteMany();

  const markham = await prisma.hub.create({ data: { name: "Markham", slug: "markham", province: "ON" } });
  const toronto = await prisma.hub.create({ data: { name: "Toronto", slug: "toronto", province: "ON" } });
  const hubs = { Markham: markham, Toronto: toronto };

  const userSpecs: { initials: string; name: string; role: Role }[] = [
    { initials: "U1", name: "User 1", role: Role.ADMIN },
    { initials: "U2", name: "User 2", role: Role.DISPATCHER },
    { initials: "U3", name: "User 3", role: Role.DISPATCHER },
    { initials: "U4", name: "User 4", role: Role.DISPATCHER },
    { initials: "U5", name: "User 5", role: Role.DRIVER },
    { initials: "U6", name: "User 6", role: Role.FLOOR_LEAD },
  ];
  const users: Record<string, { id: string }> = {};
  for (const u of userSpecs) {
    users[u.initials] = await prisma.user.create({ data: u });
  }

  function pickHub(): string {
    return chance(0.6) ? hubs.Markham.id : hubs.Toronto.id;
  }
  function pickCreatedBy(): string {
    return users[pick(["U1", "U2", "U3", "U4"])].id;
  }
  function pickAssignedTo(): string | undefined {
    return chance(0.5) ? users[pick(["U1", "U2", "U3", "U4", "U5", "U6"])].id : undefined;
  }

  const specs: OrderSpec[] = [];
  let seq = 2000;
  const nextNumber = () => `FR00${seq++}`;

  // === Named orders from the mockup (data-model.md §2.7) — 7 total ===

  // DRAFT-003 — Consolidation, DRAFT, "без qty і carrier" -> declaredQty 0, no carrier/amount.
  specs.push({
    number: "DRAFT-003",
    type: OrderType.CONSOLIDATION,
    status: OrderStatus.DRAFT,
    hubId: hubs.Markham.id,
    scheduledAt: daysAgo(0, 9, 0),
    closedAt: null,
    createdAt: daysAgo(0, 8, 30),
    declaredQty: 0,
    amount: null,
    createdById: users.U1.id,
    locked: true,
  });

  // FR001674 — Consolidation, IN_PROGRESS, alert (active)
  specs.push({
    number: "FR001674",
    type: OrderType.CONSOLIDATION,
    status: OrderStatus.IN_PROGRESS,
    hubId: hubs.Markham.id,
    scheduledAt: daysAgo(3, 11, 0),
    closedAt: null,
    createdAt: createdAtOutsideCurrentWeek(daysAgo(3, 10, 30)),
    hasAlert: true,
    alertMessage: "photo missing",
    declaredQty: 20,
    actualQty: 18,
    carrierName: "TForce",
    destination: "Calgary, AB",
    trailersCount: 1,
    nextActionLabel: "Upload photo",
    createdById: users.U3.id,
    locked: true,
    subOrders: [
      { code: "FR001674-1", refNumber: "REF-1005", pallets: 11 },
      { code: "FR001674-2", refNumber: "REF-1006", pallets: 7, hasAlert: true, alertMessage: "missing photo" },
    ],
  });

  // FR001676 — Consolidation, IN_PROGRESS (active)
  specs.push({
    number: "FR001676",
    type: OrderType.CONSOLIDATION,
    status: OrderStatus.IN_PROGRESS,
    hubId: hubs.Markham.id,
    scheduledAt: daysAgo(4, 9, 0),
    closedAt: null,
    createdAt: createdAtOutsideCurrentWeek(daysAgo(4, 8, 30)),
    declaredQty: 15,
    unit: PalletUnit.STANDARD,
    xlQty: 3,
    driverName: "User 5",
    destination: "Toronto, ON",
    trailersCount: 2,
    nextActionLabel: "Loading · 2h 14m",
    createdById: users.U1.id,
    locked: true,
    subOrders: [
      { code: "FR001676-1", refNumber: "REF-1001", pallets: 9 },
      { code: "FR001676-2", refNumber: "REF-1003", pallets: 6 },
      { code: "FR001676-3", refNumber: "REF-1002", pallets: 12 },
    ],
  });

  // FR001681 — Cross-Dock, READY (active)
  specs.push({
    number: "FR001681",
    type: OrderType.CROSS_DOCK,
    status: OrderStatus.READY,
    hubId: hubs.Toronto.id,
    scheduledAt: daysAgo(1, 14, 0),
    closedAt: null,
    createdAt: createdAtOutsideCurrentWeek(daysAgo(1, 13, 30)),
    refNumber: "REF-1004",
    service: "Storage",
    declaredQty: 23,
    carrierName: "Schneider",
    destination: "Detroit, MI",
    nextActionLabel: "Waiting for truck",
    createdById: users.U2.id,
    locked: true,
  });

  // FR001672 — Cross-Dock, CLOSED
  specs.push({
    number: "FR001672",
    type: OrderType.CROSS_DOCK,
    status: OrderStatus.CLOSED,
    hubId: hubs.Markham.id,
    scheduledAt: daysAgo(2, 17, 30),
    closedAt: daysAgo(2, 19, 0),
    createdAt: daysAgo(2, 17, 0),
    refNumber: "REF-1007",
    service: "Pickup",
    declaredQty: 10,
    unit: PalletUnit.XL,
    carrierName: "Self pickup",
    destination: "Brampton, ON",
    createdById: users.U1.id,
    locked: true,
  });

  // FR001668 — Consolidation, CLOSED
  specs.push({
    number: "FR001668",
    type: OrderType.CONSOLIDATION,
    status: OrderStatus.CLOSED,
    hubId: hubs.Markham.id,
    scheduledAt: daysAgo(5, 9, 0),
    closedAt: daysAgo(5, 15, 0),
    createdAt: daysAgo(5, 8, 30),
    declaredQty: 28,
    unit: PalletUnit.STANDARD,
    carrierName: "TForce",
    destination: "Toronto, ON",
    createdById: users.U4.id,
    locked: true,
    subOrders: [
      { code: "FR001668-1", refNumber: "REF-1008", pallets: 15 },
      { code: "FR001668-2", refNumber: "REF-1009", pallets: 8 },
      { code: "FR001668-3", refNumber: "REF-1010", pallets: 20 },
      { code: "FR001668-4", refNumber: "REF-1011", pallets: 12 },
    ],
  });

  // FR001383 — Cross-Dock, IN_PROGRESS (active), the Order Detail showcase order
  const fr1383ScheduledAt = daysAgo(2, 8, 0);
  specs.push({
    number: "FR001383",
    type: OrderType.CROSS_DOCK,
    status: OrderStatus.IN_PROGRESS,
    hubId: hubs.Markham.id,
    scheduledAt: fr1383ScheduledAt,
    closedAt: null,
    createdAt: createdAtOutsideCurrentWeek(daysAgo(2, 7, 30)),
    customer: "R-way Transport",
    service: "Transload, Restock & Rework",
    refNumber: "REF-1012",
    declaredQty: 10,
    unit: PalletUnit.STANDARD,
    actualQty: 12,
    carrierName: "R-way Transport Inc.",
    carrierPhone: "+1 647 555 0199",
    truckNumber: "TRK-4521",
    trailerNumber: "TRL-8830",
    dock: "Dock 12 · Bay B",
    photosCount: 0,
    photosLimit: 5,
    commentsCount: 0,
    warehouseNote: "Received 12 pallets instead of 10 per BOL. One pallet damaged — sent to Disposal.",
    createdById: users.U2.id,
    assignedToId: users.U6.id,
    locked: true,
    operations: [
      { type: OperationType.UNLOADING, trailerNumber: "TRL-8830", qty: 12, appliedAt: atTime(fr1383ScheduledAt, 8, 55), commentsCount: 0, photosCount: 4, isBillable: true },
      { type: OperationType.DISPOSAL, qty: 1, appliedAt: atTime(fr1383ScheduledAt, 9, 10), commentsCount: 1, photosCount: 2, isBillable: false },
      { type: OperationType.RESTACK, qty: 11, appliedAt: atTime(fr1383ScheduledAt, 9, 25), commentsCount: 0, photosCount: 1, isBillable: false },
      { type: OperationType.LOADING, trailerNumber: "TRL-8830", qty: 11, appliedAt: atTime(fr1383ScheduledAt, 10, 40), commentsCount: 0, photosCount: 0, isBillable: true },
    ],
    supplies: [
      { sku: "Straps 12", category: "Securement", qty: 4, unitPrice: 4.5 },
      { sku: "Corners 50", category: "Edge protect", qty: 16, unitPrice: 1.2 },
      { sku: "Shrink wrap 120g", category: "Wrap", qty: 2, unitPrice: 18.0 },
    ],
  });

  /**
   * Group A CLOSED order dates. `closedAt` is derived from `scheduledAt`, never drawn
   * independently — two independent draws produced orders closed days *before* they were
   * scheduled, which is visible on Order Detail.
   *
   * `scheduledAt` starts at 2 days ago (not 0) so `closedAt` a few hours later is still in the
   * past, and stays inside the 30-day window that `countTab(all)` and `countCompletedLast30d`
   * assert on.
   */
  function recentClosedDates(): { scheduledAt: Date; closedAt: Date } {
    const scheduledAt = daysAgo(randInt(2, 29), randInt(7, 17), 0);
    const closedAt = new Date(scheduledAt.getTime() + randInt(2, 10) * HOUR_MS);
    return { scheduledAt, closedAt };
  }

  // === Generated orders — reusable builder ===
  function buildGeneratedOrder(params: {
    type: OrderType;
    status: OrderStatus;
    scheduledAt: Date;
    closedAt: Date | null;
    createdAt: Date;
    hasAlert?: boolean;
    awaitingClientAction?: boolean;
  }): OrderSpec {
    const orderNumber = nextNumber();
    const isClosed = params.status === OrderStatus.CLOSED;
    const spec: OrderSpec = {
      number: orderNumber,
      type: params.type,
      status: params.status,
      hubId: pickHub(),
      scheduledAt: params.scheduledAt,
      closedAt: params.closedAt,
      createdAt: params.createdAt,
      hasAlert: params.hasAlert ?? false,
      alertMessage: params.hasAlert ? pick(ALERT_MESSAGES) : undefined,
      awaitingClientAction: params.awaitingClientAction ?? false,
      refNumber: chance(0.4) ? `REF-${randInt(2000, 9999)}` : undefined,
      service: pick(SERVICES),
      customer: pick(CUSTOMERS),
      destination: pick(CITIES),
      ...buildCargo(isClosed),
      ...buildTransport(),
      ...buildWarehouseMeta(),
      nextActionLabel: buildNextAction(params.status),
      createdById: pickCreatedBy(),
      assignedToId: pickAssignedTo(),
      supplies: chance(0.7) ? buildSupplies() : undefined,
      operations: chance(0.6) ? buildOperations(params.scheduledAt, randInt(1, 3)) : undefined,
    };
    if (params.type === OrderType.CONSOLIDATION) {
      spec.subOrders = buildSubOrders(orderNumber, randInt(1, 4));
    }
    return spec;
  }

  // 1 generated Alerts-tab order (Cross-Dock, IN_PROGRESS, active — confirmed by user)
  const genAlertScheduled = daysAgo(6, 10, 0);
  specs.push(
    buildGeneratedOrder({
      type: OrderType.CROSS_DOCK,
      status: OrderStatus.IN_PROGRESS,
      scheduledAt: genAlertScheduled,
      closedAt: null,
      createdAt: createdAtOutsideCurrentWeek(genAlertScheduled),
      hasAlert: true,
    }),
  );

  // Cross-Dock tab generated: 15 total = 1 active (CONSOLIDATED, awaitingClientAction) + 14 CLOSED
  {
    const activeScheduled = daysAgo(randInt(0, 6), randInt(7, 17), 0);
    specs.push(
      buildGeneratedOrder({
        type: OrderType.CROSS_DOCK,
        status: OrderStatus.CONSOLIDATED,
        scheduledAt: activeScheduled,
        closedAt: null,
        createdAt: createdAtInCurrentWeek(),
        awaitingClientAction: true,
      }),
    );
    for (let i = 0; i < 14; i++) {
      const { scheduledAt, closedAt } = recentClosedDates();
      specs.push(
        buildGeneratedOrder({
          type: OrderType.CROSS_DOCK,
          status: OrderStatus.CLOSED,
          scheduledAt,
          closedAt,
          createdAt: scheduledAt,
        }),
      );
    }
  }

  // Consolidation tab generated: 4 total = 1 active (IN_TRANSIT) + 3 CLOSED
  {
    const activeScheduled = daysAgo(randInt(0, 6), randInt(7, 17), 0);
    specs.push(
      buildGeneratedOrder({
        type: OrderType.CONSOLIDATION,
        status: OrderStatus.IN_TRANSIT,
        scheduledAt: activeScheduled,
        closedAt: null,
        createdAt: createdAtInCurrentWeek(),
      }),
    );
    for (let i = 0; i < 3; i++) {
      const { scheduledAt, closedAt } = recentClosedDates();
      specs.push(
        buildGeneratedOrder({
          type: OrderType.CONSOLIDATION,
          status: OrderStatus.CLOSED,
          scheduledAt,
          closedAt,
          createdAt: scheduledAt,
        }),
      );
    }
  }

  // === Group B — 45 older orders, all CLOSED, scheduledAt 31-70 days ago (data-model.md §2.4) ===
  //
  // The windows deliberately avoid the exact 30/60-day boundaries. `cutoff30`/`cutoff60` are exact
  // instants (T minus N×24h), while daysAgo() lands on a calendar day at a fixed hour — so an order
  // drawn at exactly 60 days ago falls on whichever side of cutoff60 the *clock time of the seed
  // run* puts it. That made the 24/20 assertions pass in the evening and fail in the morning.
  // 32–59 and 62–69 keep at least a full day of margin on both sides, whatever the hour.
  const groupBWindows: [count: number, minClosedDaysAgo: number, maxClosedDaysAgo: number][] = [
    [5, 1, 28], // closed inside the last 30 days -> feeds countCompletedLast30d = 24
    [20, 32, 59], // closed in the previous 30-day window -> countCompletedPrev30d = 20
    [20, 62, 69], // closed longer ago -> only feeds the older chart buckets
  ];
  for (const [count, minDays, maxDays] of groupBWindows) {
    for (let i = 0; i < count; i++) {
      const type = chance(0.75) ? OrderType.CROSS_DOCK : OrderType.CONSOLIDATION;
      const closedDaysAgo = randInt(minDays, maxDays);
      const closedAt = daysAgo(closedDaysAgo, randInt(9, 18), 0);
      // scheduledAt must be older than closedAt and stay inside group B's 31-70 day window.
      const scheduledDaysAgo = Math.min(70, Math.max(31, closedDaysAgo + randInt(1, 10)));
      const scheduledAt = daysAgo(scheduledDaysAgo, randInt(7, 17), 0);
      specs.push(
        buildGeneratedOrder({
          type,
          status: OrderStatus.CLOSED,
          scheduledAt,
          closedAt,
          createdAt: scheduledAt,
        }),
      );
    }
  }

  // === W7 money peak (data-model.md §2.6: "Best week: W7") ===
  // Guarantee at least 5 CLOSED, unlocked orders land in the W7 date range so the spend
  // chart has a clear peak regardless of how the random scatter above landed.
  //
  // Two constraints the candidate filter has to respect — this step rewrites closedAt *after*
  // the counts were designed, so it is the easiest place in the seed to silently break them:
  //   1. only orders already closed inside the last 30 days are eligible. W7 is always inside
  //      that window (15-27 days back), so moving one keeps countCompletedLast30d/Prev30d intact.
  //      Moving a 62-69-day-old order here would quietly turn 24/20 into 25/20.
  //   2. the order must have been scheduled before the end of W7, so the new closedAt can still
  //      be at or after scheduledAt.
  const MIN_W7_MEMBERS = 5;
  const closedUnlocked = specs.filter((s) => s.status === OrderStatus.CLOSED && s.closedAt && !s.locked);
  const alreadyInW7 = closedUnlocked.filter((s) => inW7(s.closedAt!));
  if (alreadyInW7.length < MIN_W7_MEMBERS) {
    const needed = MIN_W7_MEMBERS - alreadyInW7.length;
    const earliestAllowed = (s: OrderSpec) => Math.max(w7Start.getTime(), s.scheduledAt.getTime() + 2 * HOUR_MS);
    const candidates = closedUnlocked.filter(
      (s) => !inW7(s.closedAt!) && s.closedAt!.getTime() >= cutoff30.getTime() && earliestAllowed(s) <= w7End.getTime(),
    );
    if (candidates.length < needed) {
      throw new Error(`W7 peak needs ${needed} more eligible orders, only ${candidates.length} qualify`);
    }
    for (let i = 0; i < needed; i++) {
      const lo = earliestAllowed(candidates[i]);
      candidates[i].closedAt = new Date(lo + Math.floor(rand() * (w7End.getTime() - lo)));
    }
  }

  // Assign amounts last, once every closedAt is final (DECISIONS.md B9).
  for (const spec of specs) {
    spec.amount = spec.status === OrderStatus.DRAFT ? null : amountFor(spec.type, spec.closedAt);
  }

  console.log(`Built ${specs.length} order specs, writing to DB...`);

  for (const spec of specs) {
    const order = await prisma.order.create({
      data: {
        number: spec.number,
        type: spec.type,
        status: spec.status,
        hasAlert: spec.hasAlert ?? false,
        alertMessage: spec.alertMessage,
        awaitingClientAction: spec.awaitingClientAction ?? false,
        refNumber: spec.refNumber,
        service: spec.service,
        customer: spec.customer,
        destination: spec.destination,
        hubId: spec.hubId,
        scheduledAt: spec.scheduledAt,
        closedAt: spec.closedAt,
        declaredQty: spec.declaredQty,
        actualQty: spec.actualQty,
        unit: spec.unit,
        xlQty: spec.xlQty,
        carrierName: spec.carrierName,
        driverName: spec.driverName,
        carrierPhone: spec.carrierPhone,
        truckNumber: spec.truckNumber,
        trailerNumber: spec.trailerNumber,
        dock: spec.dock,
        trailersCount: spec.trailersCount,
        warehouseNote: spec.warehouseNote,
        photosCount: spec.photosCount,
        photosLimit: spec.photosLimit,
        commentsCount: spec.commentsCount,
        amount: spec.amount,
        nextActionLabel: spec.nextActionLabel,
        createdById: spec.createdById,
        assignedToId: spec.assignedToId,
        createdAt: spec.createdAt,
      },
    });

    if (spec.subOrders?.length) {
      await prisma.subOrder.createMany({
        data: spec.subOrders.map((so, i) => ({ ...so, orderId: order.id, position: i + 1 })),
      });
    }
    if (spec.operations?.length) {
      await prisma.operation.createMany({ data: spec.operations.map((op) => ({ ...op, orderId: order.id })) });
    }
    if (spec.supplies?.length) {
      await prisma.supply.createMany({ data: spec.supplies.map((s) => ({ ...s, orderId: order.id })) });
    }
  }

  console.log("Write complete. Running assertions...");
  await runAssertions();
  console.log("All assertions passed.");
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
