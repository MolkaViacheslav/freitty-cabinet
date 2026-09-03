// Pure formatting/computation helpers for qty, money and dates. No Decimal ever reaches
// these — callers convert Prisma Decimal → number in the DTO layer first (DECISIONS.md C).

import type { PalletUnit } from "@prisma/client";

/** "15 × Std + 3 × XL" style label. `unit` is the primary pallet unit; xlQty is extra XL on top. */
export function formatQuantityLabel(unit: PalletUnit, qty: number, xlQty: number): string {
  if (unit === "XL") return `${qty} × XL`;
  if (xlQty > 0) return `${qty} × Std + ${xlQty} × XL`;
  return `${qty} × Std`;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** DECISIONS.md B9: lineTotal is computed, never stored. */
export function computeLineTotal(qty: number, unitPrice: number): number {
  return round2(qty * unitPrice);
}

export function computeSuppliesSubtotal(items: { qty: number; unitPrice: number }[]): number {
  return round2(items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0));
}

/** Percent change, rounded to the nearest integer (DECISIONS.md B8 — trends are computed, not hardcoded). */
export function computeTrendPercent(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return `$${value.toFixed(2)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Apr, 09:00" — mockup date style. Always UTC (CLAUDE.md: dates stored UTC, formatted only here). */
export function formatDate(date: Date): string {
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hh}:${mm}`;
}
