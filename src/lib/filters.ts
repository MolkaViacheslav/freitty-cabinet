// Query params → Prisma `where`. Pure — no Prisma client import, just the input type
// from @prisma/client. Combination rules: DECISIONS.md B1 (tab priority) and B2 (AND, drafts
// ignores status).

import type { OrderStatus, OrderType, Prisma } from "@prisma/client";
import { startOfIsoWeek } from "@/lib/week";

export const ORDER_TABS = ["all", "cross-dock", "consolidation", "alerts", "drafts"] as const;
export type OrderTabFilter = (typeof ORDER_TABS)[number];

export const ORDER_STATUS_FILTERS = ["new", "in-progress"] as const;
export type OrderStatusFilter = (typeof ORDER_STATUS_FILTERS)[number];

export const ORDER_PERIODS = ["today", "this-week", "last-30-days"] as const;
export type OrderPeriodFilter = (typeof ORDER_PERIODS)[number];

export type OrdersFilters = {
  tab?: OrderTabFilter;
  hub?: string;
  status?: OrderStatusFilter;
  period?: OrderPeriodFilter;
  search?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getPeriodStart(period: OrderPeriodFilter, now: Date): Date {
  switch (period) {
    case "today":
      return startOfUtcDay(now);
    case "this-week":
      return startOfIsoWeek(now); // shared with lib/week.ts — one definition of "start of week"
    case "last-30-days":
      return new Date(now.getTime() - 30 * DAY_MS);
  }
}

/**
 * Prisma's `contains` compiles to `ILIKE '%value%'`, so `%` and `_` coming from user input are
 * LIKE wildcards, not literals — `?search=%` would match every row. Escape them (and the escape
 * character itself) so the search box only ever does a literal substring match.
 */
export function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Builds the Prisma `where` for GET /api/orders. `now` is injectable for deterministic tests.
 *
 * Tab priority (DECISIONS.md B1): Draft → Alert → type. Each tab is mutually exclusive with
 * the others, so `all` adds no extra predicate — it's just hub/status/period/search.
 */
export function buildOrdersWhere(filters: OrdersFilters, now: Date = new Date()): Prisma.OrderWhereInput {
  const conditions: Prisma.OrderWhereInput[] = [];

  switch (filters.tab) {
    case "drafts":
      conditions.push({ status: "DRAFT" });
      break;
    case "alerts":
      conditions.push({ hasAlert: true, status: { not: "DRAFT" } });
      break;
    case "cross-dock":
      conditions.push({ type: "CROSS_DOCK", hasAlert: false, status: { not: "DRAFT" } });
      break;
    case "consolidation":
      conditions.push({ type: "CONSOLIDATION", hasAlert: false, status: { not: "DRAFT" } });
      break;
    case "all":
    case undefined:
      break;
  }

  if (filters.hub) {
    // Match Hub.slug, not Hub.name — api-contract.md documents `?hub=` as a slug, and matching
    // on the display name silently breaks for any hub whose name isn't a single word.
    conditions.push({ hub: { slug: filters.hub.toLowerCase() } });
  }

  // Drafts tab ignores the status filter — a draft has no meaningful pipeline status (DECISIONS.md B2).
  if (filters.status && filters.tab !== "drafts") {
    conditions.push({ status: filters.status === "new" ? "READY" : "IN_PROGRESS" });
  }

  conditions.push({ scheduledAt: { gte: getPeriodStart(filters.period ?? "last-30-days", now) } });

  if (filters.search) {
    const needle = escapeLikeWildcards(filters.search);
    conditions.push({
      OR: [
        { number: { contains: needle, mode: "insensitive" } },
        { refNumber: { contains: needle, mode: "insensitive" } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

// --- tab counters ---------------------------------------------------------------------

export type TabCounterGroup = { status: OrderStatus; hasAlert: boolean; type: OrderType; count: number };
export type TabCounters = { all: number; crossDock: number; consolidation: number; alerts: number; drafts: number };

/**
 * Folds a `groupBy(['status', 'hasAlert', 'type'])` result into the five tab counters,
 * applying the same mutually-exclusive priority as buildOrdersWhere's tab switch
 * (Draft → Alert → type, DECISIONS.md B1) so the segments always sum to `all`.
 */
export function foldTabCounters(groups: TabCounterGroup[]): TabCounters {
  const counters: TabCounters = { all: 0, crossDock: 0, consolidation: 0, alerts: 0, drafts: 0 };
  for (const g of groups) {
    counters.all += g.count;
    if (g.status === "DRAFT") {
      counters.drafts += g.count;
    } else if (g.hasAlert) {
      counters.alerts += g.count;
    } else if (g.type === "CROSS_DOCK") {
      counters.crossDock += g.count;
    } else {
      counters.consolidation += g.count;
    }
  }
  return counters;
}
