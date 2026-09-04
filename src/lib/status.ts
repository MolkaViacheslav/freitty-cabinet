// Pipeline status/type → UI label mapping. Source of truth: DECISIONS.md B4.

import type { OperationType, OrderStatus, OrderType, PalletUnit, Role } from "@prisma/client";

/**
 * DECISIONS.md B6: active = everything except DRAFT and CLOSED.
 *
 * Lives here, not in a service, because two callers depend on it agreeing exactly: the
 * "Active Orders" KPI count and the list of order cards under it. If they used separate
 * definitions the dashboard could say 7 and then show cards that aren't in that 7.
 */
export const ACTIVE_ORDER_STATUSES = [
  "READY",
  "IN_PROGRESS",
  "CONSOLIDATED",
  "IN_TRANSIT",
  "DECONSOLIDATED",
] as const satisfies readonly OrderStatus[];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  DISPATCHER: "Dispatcher",
  DRIVER: "Driver",
  FLOOR_LEAD: "Floor lead",
};

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  CROSS_DOCK: "Cross-Dock",
  CONSOLIDATION: "Consolidation",
};

export function getOrderTypeLabel(type: OrderType): string {
  return ORDER_TYPE_LABELS[type];
}

const STATUS_LABELS: Record<OrderStatus, string | Record<OrderType, string>> = {
  DRAFT: "Draft",
  READY: "New",
  IN_PROGRESS: { CROSS_DOCK: "On Stock", CONSOLIDATION: "In progress" },
  CONSOLIDATED: "Consolidated",
  IN_TRANSIT: "In transit",
  DECONSOLIDATED: "Deconsolidated",
  CLOSED: "Completed",
};

/**
 * hasAlert overrides the pipeline label with "Alert" regardless of status/type
 * (DECISIONS.md B4: the alert badge replaces the status badge, the type badge stays).
 */
export function getStatusLabel(status: OrderStatus, type: OrderType, hasAlert = false): string {
  if (hasAlert) return "Alert";
  const entry = STATUS_LABELS[status];
  return typeof entry === "string" ? entry : entry[type];
}

/**
 * The full pipeline rail, in order — the seven states DECISIONS.md B4 quotes from the mockup.
 *
 * Exported because the Order Detail "Status flow" row draws the whole rail and marks which steps
 * were actually traversed. Drawing only the traversed part (what `getStatusFlow` returns) made the
 * current step always the last one rendered, so the highlight carried no information.
 */
export const ORDER_PIPELINE = [
  "DRAFT",
  "READY",
  "IN_PROGRESS",
  "CONSOLIDATED",
  "IN_TRANSIT",
  "DECONSOLIDATED",
  "CLOSED",
] as const satisfies readonly OrderStatus[];

const PIPELINE_ORDER: OrderStatus[] = [...ORDER_PIPELINE];

/**
 * "Path traversed" for the Order Detail status flow. We only store the current `status`,
 * not a history table, so CLOSED is treated as reachable directly from IN_PROGRESS rather
 * than implying every consolidation-specific stage (Consolidated/In Transit/Deconsolidated)
 * was visited — matches the api-contract.md example ["DRAFT","READY","IN_PROGRESS","CLOSED"].
 */
export function getStatusFlow(status: OrderStatus): OrderStatus[] {
  if (status === "CLOSED") return ["DRAFT", "READY", "IN_PROGRESS", "CLOSED"];
  const idx = PIPELINE_ORDER.indexOf(status);
  return PIPELINE_ORDER.slice(0, idx + 1);
}

const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  UNLOADING: "Unloading",
  DISPOSAL: "Disposal",
  RESTACK: "Restack",
  LOADING: "Loading",
};

export function getOperationTypeLabel(type: OperationType): string {
  return OPERATION_TYPE_LABELS[type];
}

const UNIT_LABELS: Record<PalletUnit, string> = {
  STANDARD: "Standard (48×40)",
  XL: "XL",
};

export function getUnitLabel(unit: PalletUnit): string {
  return UNIT_LABELS[unit];
}
