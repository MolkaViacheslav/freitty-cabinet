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
      orderBy: { scheduledAt: "desc" },
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
      totalPages: Math.ceil(total / filters.pageSize),
    },
    counters,
  };
}

/** All matching rows, no pagination — backs /api/orders/export (same filters, same service). */
export async function getAllOrdersForExport(filters: OrdersExportQuery, now: Date = new Date()) {
  const where = buildOrdersWhere(filters, now);
  const rows = await prisma.order.findMany({
    where,
    include: orderListInclude,
    orderBy: { scheduledAt: "desc" },
  });
  return rows.map(mapOrderListItem);
}

/** `number` is the human order number ("FR001383"), not the cuid `id`. Returns null if missing. */
export async function getOrderByNumber(number: string) {
  const order = await prisma.order.findUnique({ where: { number }, include: orderDetailInclude });
  return order ? mapOrderDetail(order) : null;
}
