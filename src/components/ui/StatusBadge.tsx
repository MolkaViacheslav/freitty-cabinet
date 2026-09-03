import type { OrderStatus, OrderType } from "@prisma/client";
import { getStatusLabel } from "@/lib/status";

// Colors sourced from docs/mockup.html's .badge-* classes (B4: label is derived, color follows label).
const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-[#E5E7EB] text-[#374151]",
  New: "bg-[#D1FAE5] text-[#065F46]",
  "On Stock": "bg-[#D1FAE5] text-[#065F46]",
  "In progress": "bg-[#DBEAFE] text-[#1E40AF]",
  Consolidated: "bg-[#EDE9FE] text-[#5B21B6]",
  "In transit": "bg-[#DBEAFE] text-[#1E40AF]",
  Deconsolidated: "bg-[#EDE9FE] text-[#5B21B6]",
  Completed: "bg-[#E5E7EB] text-[#374151]",
  Alert: "bg-[#FEE2E2] text-[#991B1B]",
};

type StatusBadgeProps = {
  status: OrderStatus;
  type: OrderType;
  hasAlert?: boolean;
  className?: string;
};

/** Renders the (status, type, hasAlert) → label mapping from lib/status.ts as a mockup-style pill. */
export function StatusBadge({ status, type, hasAlert = false, className = "" }: StatusBadgeProps) {
  const label = getStatusLabel(status, type, hasAlert);
  return (
    <span
      className={`inline-block rounded-full px-2 py-[3px] text-[10px] font-bold tracking-[0.3px] uppercase ${STATUS_STYLES[label]} ${className}`}
    >
      {label}
    </span>
  );
}
