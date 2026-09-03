import type { OrderListItemDTO } from "@/server/dto/orders.dto";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { formatDate } from "@/lib/format";

type OrderCardProps = {
  order: OrderListItemDTO;
};

/** Stage 1.5 vertical slice: real DTO fields end to end, no mockup styling pass yet
 * (that is Stage 4's "OrderCard доведена до вигляду макета"). */
export function OrderCard({ order }: OrderCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-navy">{order.number}</span>
        <div className="flex gap-1">
          <TypeBadge type={order.type} />
          <StatusBadge status={order.status} type={order.type} hasAlert={order.hasAlert} />
        </div>
      </div>
      <div className="text-xs text-muted">
        {order.hub.name} → {order.destination}
      </div>
      <div className="text-xs text-muted">
        {formatDate(new Date(order.scheduledAt))} · {order.quantityLabel}
      </div>
      {order.nextActionLabel && <div className="text-xs text-ink">{order.nextActionLabel}</div>}
    </Card>
  );
}
