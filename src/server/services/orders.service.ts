import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { buildOrdersWhere, foldTabCounters } from "@/lib/filters";
import {
  mapOrderDetail,
  mapOrderListItem,
  orderDetailInclude,
  orderListInclude,
  type OrdersExportQuery,
  type OrdersQuery,
} from "@/server/dto/orders.dto";

/**
 * `scheduledAt` alone is not a unique sort key — the seed puts many orders on the same hour, and
 * Postgres gives no ordering guarantee between rows that tie. Without the `number` tiebreaker,
 * offset pagination can show the same order on page 1 and page 2 and drop another entirely.
 */
const ORDERS_SORT = [{ scheduledAt: "desc" }, { number: "desc" }] satisfies Prisma.OrderOrderByWithRelationInput[];

/** Hard cap on the unpaginated export, so a filter that matches everything can't OOM the function. */
const EXPORT_ROW_LIMIT = 5000;

/**
 * GET /api/orders. `Promise.all([findMany, count, groupBy])` — three queries in parallel,
 * not sequential (api-contract.md). Counters ignore the current tab, but include hub/period/
 * search, so switching tabs never resets the other tab counts (api-contract.md "Важливо про counters").
 */
export async function getOrders(filters: OrdersQuery, now: Date = new Date()) {
  const where = buildOrdersWhere(filters, now);
  const counterWhere = buildOrdersWhere({ hub: filters.hub, period: filters.period, search: filters.search }, now);
  const skip = (filters.page - 1) * filters.pageSize;

  const [rows, total, groups] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderListInclude,
      orderBy: ORDERS_SORT,
      skip,
      take: filters.pageSize,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status", "hasAlert", "type"],
      where: counterWhere,
      _count: { _all: true },
    }),
  ]);

  const counters = foldTabCounters(
    groups.map((g) => ({ status: g.status, hasAlert: g.hasAlert, type: g.type, count: g._count._all })),
  );

  return {
    items: rows.map(mapOrderListItem),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      // Always at least one page, so an empty result renders "Page 1 of 1", not "Page 1 of 0".
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
    counters,
  };
}

/**
 * All matching rows, no pagination — backs /api/orders/export (same filters, same service).
 * Capped at EXPORT_ROW_LIMIT: the whole result set is materialized in memory and joined into one
 * string, so an unbounded query is a memory cliff, not a slow response.
 */
export async function getAllOrdersForExport(filters: OrdersExportQuery, now: Date = new Date()) {
  const where = buildOrdersWhere(filters, now);
  const rows = await prisma.order.findMany({
    where,
    include: orderListInclude,
    orderBy: ORDERS_SORT,
    take: EXPORT_ROW_LIMIT,
  });
  return { items: rows.map(mapOrderListItem), truncated: rows.length === EXPORT_ROW_LIMIT };
}

/** `number` is the human order number ("FR001383"), not the cuid `id`. Returns null if missing. */
export async function getOrderByNumber(number: string) {
  const order = await prisma.order.findUnique({ where: { number }, include: orderDetailInclude });
  return order ? mapOrderDetail(order) : null;
}
