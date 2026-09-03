import type { OrderType } from "@prisma/client";
import { getOrderTypeLabel } from "@/lib/status";

// Colors from docs/mockup.html: .badge-simple (Cross-Dock), .badge-consol (Consolidation).
const TYPE_STYLES: Record<OrderType, string> = {
  CROSS_DOCK: "bg-[#CFFAFE] text-[#155E75]",
  CONSOLIDATION: "bg-[#EDE9FE] text-[#5B21B6]",
};

type TypeBadgeProps = {
  type: OrderType;
  className?: string;
};

export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-[3px] text-[10px] font-bold tracking-[0.3px] uppercase ${TYPE_STYLES[type]} ${className}`}
    >
      {getOrderTypeLabel(type)}
    </span>
  );
}
