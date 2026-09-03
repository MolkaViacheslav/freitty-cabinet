// Pipeline status/type → UI label mapping. Source of truth: DECISIONS.md B4.

import type { OperationType, OrderStatus, OrderType, PalletUnit } from "@prisma/client";

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

const PIPELINE_ORDER: OrderStatus[] = [
  "DRAFT",
  "READY",
  "IN_PROGRESS",
  "CONSOLIDATED",
  "IN_TRANSIT",
  "DECONSOLIDATED",
  "CLOSED",
];

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
