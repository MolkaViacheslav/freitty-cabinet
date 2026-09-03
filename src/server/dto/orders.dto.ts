// zod query schemas + Prisma model → API model mappers. Decimal → number, Date → ISO
// happen only here (DECISIONS.md C). Source of truth for response shape: docs/api-contract.md.

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ORDER_PERIODS, ORDER_STATUS_FILTERS, ORDER_TABS } from "@/lib/filters";
import { getOperationTypeLabel, getStatusFlow, getStatusLabel, getUnitLabel } from "@/lib/status";
import { computeLineTotal, computeSuppliesSubtotal, formatQuantityLabel } from "@/lib/format";

// --- query schemas -----------------------------------------------------------------

export const ordersQuerySchema = z.object({
  tab: z.enum(ORDER_TABS).default("all"),
  hub: z.string().trim().min(1).optional(),
  status: z.enum(ORDER_STATUS_FILTERS).optional(),
  period: z.enum(ORDER_PERIODS).default("last-30-days"),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
});
export type OrdersQuery = z.infer<typeof ordersQuerySchema>;

export const ordersExportQuerySchema = ordersQuerySchema.omit({ page: true, pageSize: true });
export type OrdersExportQuery = z.infer<typeof ordersExportQuerySchema>;

export const dashboardQuerySchema = z.object({
  granularity: z.enum(["week", "month"]).default("week"),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

// --- Prisma includes (single source of truth for the shape services fetch) ---------

export const orderListInclude = {
  hub: true,
  createdBy: true,
  subOrders: { orderBy: { position: "asc" } },
} satisfies Prisma.OrderInclude;

export const orderDetailInclude = {
  hub: true,
  createdBy: true,
  assignedTo: true,
  subOrders: { orderBy: { position: "asc" } },
  operations: { orderBy: { appliedAt: "asc" } },
  supplies: true,
} satisfies Prisma.OrderInclude;

type OrderListRow = Prisma.OrderGetPayload<{ include: typeof orderListInclude }>;
type OrderDetailRow = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

// --- mappers -------------------------------------------------------------------------

function mapSubOrder(so: OrderListRow["subOrders"][number]) {
  return {
    code: so.code,
    refNumber: so.refNumber,
    pallets: so.pallets,
    hasAlert: so.hasAlert,
    alertMessage: so.alertMessage,
  };
}

export function mapOrderListItem(order: OrderListRow) {
  return {
    id: order.id,
    number: order.number,
    type: order.type,
    status: order.status,
    statusLabel: getStatusLabel(order.status, order.type, order.hasAlert),
    hasAlert: order.hasAlert,
    alertMessage: order.alertMessage,
    refNumber: order.refNumber,
    service: order.service,
    hub: { name: order.hub.name, province: order.hub.province },
    scheduledAt: order.scheduledAt.toISOString(),
    destination: order.destination,
    declaredQty: order.declaredQty,
    actualQty: order.actualQty,
    unit: order.unit,
    xlQty: order.xlQty,
    quantityLabel: formatQuantityLabel(order.unit, order.declaredQty, order.xlQty),
    carrierName: order.carrierName,
    driverName: order.driverName,
    trailersCount: order.trailersCount,
    nextActionLabel: order.nextActionLabel,
    amount: order.amount === null ? null : Number(order.amount),
    commentsCount: order.commentsCount,
    photosCount: order.photosCount,
    photosLimit: order.photosLimit,
    createdBy: { initials: order.createdBy.initials, name: order.createdBy.name, role: order.createdBy.role },
    subOrders: order.subOrders.map(mapSubOrder),
    subOrdersCount: order.subOrders.length,
  };
}
export type OrderListItemDTO = ReturnType<typeof mapOrderListItem>;

function computeDelta(expected: number, actual: number | null) {
  if (actual === null) {
    return { expected, actual: null, diff: null, hasDelta: false };
  }
  const diff = actual - expected;
  return { expected, actual, diff, hasDelta: diff !== 0 };
}

export function mapOrderDetail(order: OrderDetailRow) {
  const operations = order.operations.map((op) => ({
    id: op.id,
    type: op.type,
    typeLabel: getOperationTypeLabel(op.type),
    trailerNumber: op.trailerNumber,
    qty: op.qty,
    unit: op.unit,
    unitLabel: getUnitLabel(op.unit),
    appliedAt: op.appliedAt.toISOString(),
    commentsCount: op.commentsCount,
    photosCount: op.photosCount,
    isBillable: op.isBillable,
  }));

  const supplies = order.supplies.map((s) => {
    const unitPrice = Number(s.unitPrice);
    return { id: s.id, sku: s.sku, category: s.category, qty: s.qty, unitPrice, lineTotal: computeLineTotal(s.qty, unitPrice) };
  });

  return {
    ...mapOrderListItem(order),
    customer: order.customer,
    assignedTo: order.assignedTo
      ? { initials: order.assignedTo.initials, name: order.assignedTo.name, role: order.assignedTo.role }
      : null,
    carrierPhone: order.carrierPhone,
    truckNumber: order.truckNumber,
    trailerNumber: order.trailerNumber,
    dock: order.dock,
    warehouseNote: order.warehouseNote,
    delta: computeDelta(order.declaredQty, order.actualQty),
    statusFlow: getStatusFlow(order.status),
    operations,
    supplies,
    suppliesSubtotal: computeSuppliesSubtotal(supplies),
  };
}
export type OrderDetailDTO = ReturnType<typeof mapOrderDetail>;
