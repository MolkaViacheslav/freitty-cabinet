import Link from "next/link";
import type { OrderListItemDTO } from "@/server/dto/orders.dto";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { AwaitingActionBadge } from "@/components/orders/AwaitingActionBadge";
import { getOrderTypeLabel, getRoleLabel } from "@/lib/status";
import { formatDate } from "@/lib/format";

type OrderCardProps = {
  order: OrderListItemDTO;
};

// Avatar tints from docs/mockup.html's .oc-by .ava rules. Picked by a hash of the initials rather
// than a per-user map, so any user the database returns gets a stable colour without a lookup
// table that would go stale (CLAUDE.md: nothing about the data is hardcoded in the UI).
const AVATAR_COLORS = ["#5B21B6", "#0EA5E9", "#16A34A", "#D97706", "#DC2626", "#0F766E"];

function avatarColor(initials: string): string {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) hash = (hash * 31 + initials.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** "Consolidation · 3 sub-orders" / "Cross-Dock · Storage" — the mockup's .oc-type line. */
function subtitle(order: OrderListItemDTO): string {
  const typeLabel = getOrderTypeLabel(order.type);
  if (order.subOrdersCount > 0) {
    return `${typeLabel} · ${order.subOrdersCount} sub-order${order.subOrdersCount === 1 ? "" : "s"}`;
  }
  return order.service ? `${typeLabel} · ${order.service}` : typeLabel;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <div className="text-muted">{label}</div>
      <div className="font-semibold text-ink">{children}</div>
    </div>
  );
}

/**
 * The unified order card from docs/mockup.html (.order-card): header with number/ref/author and
 * badges, a six-field body, and a footer with the next action. Every value comes from the DTO —
 * the card computes no domain facts of its own, it only lays them out.
 *
 * An alert order gets a red top border and, via StatusBadge, an "Alert" badge that replaces the
 * status badge while the type badge stays (DECISIONS.md B3).
 */
export function OrderCard({ order }: OrderCardProps) {
  const carrier = order.carrierName ?? (order.driverName ? `Driver: ${order.driverName}` : null);
  const showTrailers = order.trailersCount > 0;

  return (
    <Link
      href={`/orders/${order.number}`}
      // Detail pages are force-dynamic and hit Postgres, so prefetching every visible card would
      // fire a server render per card just for hovering the list. Opt out: the click itself is
      // fast enough, and this keeps a 6-card page from issuing 6 speculative queries.
      prefetch={false}
      className={`flex flex-col gap-2.5 rounded-card border border-border bg-white p-4 transition hover:border-blue hover:shadow-[0_4px_12px_rgba(31,78,121,0.08)] ${
        order.hasAlert ? "border-t-2 border-t-[#DC2626]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span data-order-number className="text-[15px] font-bold text-navy">
              {order.number}
            </span>
            {order.refNumber && (
              <span className="text-[10.5px] text-muted">
                Ref N: <span className="font-bold text-ink">{order.refNumber}</span>
              </span>
            )}
            {order.subOrdersCount > 0 && (
              <span className="rounded-lg bg-[#F3F4F6] px-2 py-px text-[10.5px] font-bold text-ink">
                {order.subOrdersCount} refs
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{subtitle(order)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10.5px] text-muted">
            <span className="text-[#9CA3AF]">by</span>
            <span className="inline-flex items-center gap-1 rounded-[10px] bg-[#F3F4F6] py-px pr-[7px] pl-0.5 font-bold text-ink">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-extrabold text-white"
                style={{ background: avatarColor(order.createdBy.initials) }}
              >
                {order.createdBy.initials}
              </span>
              {order.createdBy.name}
            </span>
            <span className="rounded bg-[#EDE9FE] px-[5px] py-px text-[9px] font-extrabold tracking-[0.3px] text-[#5B21B6] uppercase">
              {getRoleLabel(order.createdBy.role)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <TypeBadge type={order.type} />
          <StatusBadge status={order.status} type={order.type} hasAlert={order.hasAlert} />
          {order.awaitingClientAction && <AwaitingActionBadge />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Field label="Hub">{order.hub.name}</Field>
        <Field label="Date">{formatDate(new Date(order.scheduledAt))}</Field>
        <Field label="Q-ty">{order.quantityLabel}</Field>
        <Field label="Carrier">{carrier ?? "—"}</Field>
        <Field label="Destination" wide={!showTrailers}>
          {order.destination ?? "—"}
        </Field>
        {showTrailers && (
          <Field label="Trailers">
            <span className="rounded-lg bg-[#EDE9FE] px-2 py-px text-[11px] font-extrabold text-[#5B21B6]">
              {order.trailersCount} consolidated
            </span>
          </Field>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-border pt-2.5 text-xs text-muted">
        <div>
          {order.nextActionLabel ? (
            <>
              Next: <span className="font-semibold text-ink">{order.nextActionLabel}</span>
            </>
          ) : (
            <span className="text-[#9CA3AF]">No pending action</span>
          )}
        </div>
        <div className="flex gap-2 text-[11px] text-[#4B5563]">
          <span className="inline-flex h-[22px] items-center gap-1 rounded bg-page px-1.5" title="Comments">
            💬 {order.commentsCount}
          </span>
          <span className="inline-flex h-[22px] items-center gap-1 rounded bg-page px-1.5" title="Photos">
            📷 {order.photosCount}
            {order.photosLimit > 0 && `/${order.photosLimit}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
