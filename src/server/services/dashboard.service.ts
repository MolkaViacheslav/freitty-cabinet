import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getWeekBucket, getWeekBucketLabel, getWeekBucketRange, WEEK_BUCKET_COUNT } from "@/lib/week";
import { computeTrendPercent, round2 } from "@/lib/format";
import { ACTIVE_ORDER_STATUSES } from "@/lib/status";
import type { DashboardQuery } from "@/server/dto/orders.dto";

const DAY_MS = 24 * 60 * 60 * 1000;

type Trend = { direction: "up" | "down" | "flat"; value: number; label: string };
type Bucket = { key: string; startsAt: string; completed: number; spend: number };

type WeeklyAggRow = { week_start: Date; completed: number; spend: string | null };

// Raw SQL for the weekly aggregation (DECISIONS.md A4, api-contract.md: `date_trunc('week', closed_at)`).
//
// Deliberately NO `AT TIME ZONE 'UTC'` here. `closedAt` is `timestamp(3)` *without* time zone, so
// `date_trunc` operates on the stored UTC wall-clock value and is timezone-independent. Wrapping it
// in `AT TIME ZONE 'UTC'` would cast the column to `timestamptz`, and `date_trunc` on a timestamptz
// truncates in the *session's* TimeZone — i.e. it would introduce exactly the dependency it looks
// like it removes, and an order closed Monday 02:00 UTC would land in the previous bucket under a
// non-UTC session. `date_trunc('week', ...)` is Monday-start, matching lib/week.ts's ISO weeks.
async function getWeeklyAggregates(rangeStart: Date, rangeEnd: Date): Promise<WeeklyAggRow[]> {
  return prisma.$queryRaw<WeeklyAggRow[]>`
    SELECT date_trunc('week', "closedAt") AS week_start,
           COUNT(*)::int AS completed,
           COALESCE(SUM("amount"), 0)::numeric AS spend
    FROM "orders"
    WHERE "status" = 'CLOSED' AND "closedAt" >= ${rangeStart} AND "closedAt" <= ${rangeEnd}
    GROUP BY week_start
    ORDER BY week_start ASC
  `;
}

async function getWeeklyBuckets(now: Date): Promise<Bucket[]> {
  const rangeStart = getWeekBucketRange(1, now).start;
  const rangeEnd = getWeekBucketRange(WEEK_BUCKET_COUNT, now).end;
  const rows = await getWeeklyAggregates(rangeStart, rangeEnd);

  // Map each row to its bucket via the same getWeekBucket used everywhere else a date needs
  // "which of the 10 weeks is this", instead of re-deriving membership from exact timestamps.
  const completedByBucket = new Map<number, number>();
  const spendByBucket = new Map<number, number>();
  for (const row of rows) {
    const bucket = getWeekBucket(new Date(row.week_start), now);
    if (bucket === null) continue; // outside the 10-week window — shouldn't happen given rangeStart/rangeEnd
    completedByBucket.set(bucket, row.completed);
    spendByBucket.set(bucket, Number(row.spend));
  }

  // date_trunc has no rows for empty weeks — fill zeros here so the chart never jumps
  // (api-contract.md: "buckets — рівно 10 елементів... Порожні тижні заповнюються нулями").
  const buckets: Bucket[] = [];
  for (let b = 1; b <= WEEK_BUCKET_COUNT; b++) {
    const { start } = getWeekBucketRange(b, now);
    buckets.push({
      key: getWeekBucketLabel(b),
      startsAt: start.toISOString(),
      completed: completedByBucket.get(b) ?? 0,
      spend: spendByBucket.get(b) ?? 0,
    });
  }
  return buckets;
}

type MonthlyAggRow = { bucket_start: Date; completed: number; spend: string | null };

/** Monthly mode shows the same number of buckets as weekly mode — its own constant, not
 * WEEK_BUCKET_COUNT, which happens to have the same value but means "weeks". */
const MONTH_BUCKET_COUNT = 10;

function startOfUtcMonth(date: Date, monthsBack: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - monthsBack, 1));
}

async function getMonthlyBuckets(now: Date): Promise<Bucket[]> {
  const rangeStart = startOfUtcMonth(now, MONTH_BUCKET_COUNT - 1);
  const rangeEnd = new Date(startOfUtcMonth(now, -1).getTime() - 1);

  // Same reasoning as getWeeklyAggregates: no `AT TIME ZONE 'UTC'` on a `timestamp` column.
  const rows = await prisma.$queryRaw<MonthlyAggRow[]>`
    SELECT date_trunc('month', "closedAt") AS bucket_start,
           COUNT(*)::int AS completed,
           COALESCE(SUM("amount"), 0)::numeric AS spend
    FROM "orders"
    WHERE "status" = 'CLOSED' AND "closedAt" >= ${rangeStart} AND "closedAt" <= ${rangeEnd}
    GROUP BY bucket_start
    ORDER BY bucket_start ASC
  `;
  const byStart = new Map(rows.map((r) => [new Date(r.bucket_start).getTime(), r]));

  const buckets: Bucket[] = [];
  for (let b = 1; b <= MONTH_BUCKET_COUNT; b++) {
    const start = startOfUtcMonth(now, MONTH_BUCKET_COUNT - b);
    const row = byStart.get(start.getTime());
    buckets.push({
      key: `M${b}`,
      startsAt: start.toISOString(),
      completed: row?.completed ?? 0,
      spend: row ? Number(row.spend) : 0,
    });
  }
  return buckets;
}

async function getActiveOrdersKpi(now: Date) {
  const currentWeekStart = getWeekBucketRange(WEEK_BUCKET_COUNT, now).start;
  const [value, thisWeek] = await Promise.all([
    prisma.order.count({ where: { status: { in: [...ACTIVE_ORDER_STATUSES] } } }),
    prisma.order.count({ where: { status: { in: [...ACTIVE_ORDER_STATUSES] }, createdAt: { gte: currentWeekStart } } }),
  ]);
  const trend: Trend = { direction: thisWeek > 0 ? "up" : "flat", value: thisWeek, label: "this week" };
  return { value, trend };
}

async function getCompleted30dKpi(now: Date) {
  const cutoff30 = new Date(now.getTime() - 30 * DAY_MS);
  const cutoff60 = new Date(now.getTime() - 60 * DAY_MS);
  const [last30, prev30] = await Promise.all([
    prisma.order.count({ where: { status: "CLOSED", closedAt: { gte: cutoff30 } } }),
    prisma.order.count({ where: { status: "CLOSED", closedAt: { gte: cutoff60, lt: cutoff30 } } }),
  ]);
  const changePercent = computeTrendPercent(last30, prev30);
  const trend: Trend = {
    direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
    value: changePercent,
    label: "vs last month",
  };
  return { value: last30, trend, prev30, changePercent };
}

async function getNeedAttentionKpi() {
  // Single groupBy, hasAlert takes priority over awaitingClientAction (same Draft>Alert>type
  // priority idea as DECISIONS.md B1) — the two breakdown buckets are a true partition of the
  // OR'd `value`, so they're guaranteed to sum to it even if an order someday has both flags.
  //
  // Drafts are excluded, exactly like the Alerts tab (lib/filters.ts) — under B1's tab priority a
  // draft belongs to Drafts, never to Alerts, and a KPI that counted it would disagree with the
  // list the user lands on when they click through. This is the *only* intended difference from
  // the tab: no 30-day window (DECISIONS.md B5).
  const scope = { status: { not: "DRAFT" }, OR: [{ hasAlert: true }, { awaitingClientAction: true }] } satisfies Prisma.OrderWhereInput;

  const [groups, representativeAlert, representativeAwaiting] = await Promise.all([
    prisma.order.groupBy({
      by: ["hasAlert", "awaitingClientAction"],
      where: scope,
      _count: { _all: true },
    }),
    prisma.order.findFirst({
      where: { hasAlert: true, status: { not: "DRAFT" } },
      orderBy: [{ scheduledAt: "desc" }, { number: "desc" }],
      select: { number: true, alertMessage: true },
    }),
    // Same idea as representativeAlert, for the awaiting-only bucket — `hasAlert: false` matches
    // the priority used to fold awaitingOnlyCount below, so this is never an order already counted
    // as an alert. Without this, "1 · awaiting your action" had no order attached anywhere in the
    // app — the dashboard was the only place that flag was ever visible.
    prisma.order.findFirst({
      where: { hasAlert: false, awaitingClientAction: true, status: { not: "DRAFT" } },
      orderBy: [{ scheduledAt: "desc" }, { number: "desc" }],
      select: { number: true },
    }),
  ]);

  let alertCount = 0;
  let awaitingOnlyCount = 0;
  for (const g of groups) {
    if (g.hasAlert) alertCount += g._count._all;
    else if (g.awaitingClientAction) awaitingOnlyCount += g._count._all;
  }

  const breakdown: { count: number; label: string; detail: string | null; orderNumber: string | null }[] = [];
  if (alertCount > 0) {
    breakdown.push({
      count: alertCount,
      label: "alert",
      detail: representativeAlert?.alertMessage ? `${representativeAlert.alertMessage} · ${representativeAlert.number}` : null,
      orderNumber: representativeAlert?.number ?? null,
    });
  }
  if (awaitingOnlyCount > 0) {
    breakdown.push({
      count: awaitingOnlyCount,
      label: "awaiting your action",
      detail: representativeAwaiting?.number ?? null,
      orderNumber: representativeAwaiting?.number ?? null,
    });
  }

  return { value: alertCount + awaitingOnlyCount, breakdown };
}

export async function getDashboardSummary(granularity: DashboardQuery["granularity"] = "week", now: Date = new Date()) {
  const cutoff30 = new Date(now.getTime() - 30 * DAY_MS);

  // insights.bestWeek is always a week (api-contract.md's example key is "W7"), independent of
  // the activity.buckets granularity switcher — so the weekly buckets are always computed, and
  // reused as activity.buckets when granularity=week instead of querying twice.
  const [activeOrders, completed30d, needAttention, weeklyBuckets, monthlyBuckets, spendAgg] = await Promise.all([
    getActiveOrdersKpi(now),
    getCompleted30dKpi(now),
    getNeedAttentionKpi(),
    getWeeklyBuckets(now),
    granularity === "month" ? getMonthlyBuckets(now) : null,
    prisma.order.aggregate({ where: { status: "CLOSED", closedAt: { gte: cutoff30 } }, _sum: { amount: true } }),
  ]);

  const activityBuckets = monthlyBuckets ?? weeklyBuckets;
  const totalSpend30d = round2(Number(spendAgg._sum.amount ?? 0));
  const avgPerOrder = completed30d.value > 0 ? round2(totalSpend30d / completed30d.value) : 0;
  const bestWeek = weeklyBuckets.reduce((best, b) => (b.spend > best.spend ? b : best), weeklyBuckets[0]);

  return {
    kpi: {
      activeOrders,
      completed30d: { value: completed30d.value, trend: completed30d.trend },
      needAttention,
    },
    activity: { granularity, buckets: activityBuckets },
    insights: {
      completedChangePercent: completed30d.changePercent,
      totalSpend30d,
      avgPerOrder,
      bestWeek: { key: bestWeek.key, spend: bestWeek.spend },
    },
  };
}
