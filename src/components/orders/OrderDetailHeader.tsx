import Link from "next/link";
import type { OrderDetailDTO } from "@/server/dto/orders.dto";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { getRoleLabel } from "@/lib/status";

type OrderDetailHeaderProps = {
  order: OrderDetailDTO;
};

const DISABLED_BUTTON =
  "inline-flex h-[30px] cursor-not-allowed items-center gap-1 rounded-md border border-border bg-white px-2.5 text-xs text-muted";

/** The mockup's icon bar carries four actions with no data behind them yet. They render as
 * disabled controls rather than being dropped, so the screen still shows what the real cabinet
 * offers, and never fakes a click (CLAUDE.md "out of scope"). */
const OUT_OF_SCOPE_ICONS = [
  { icon: "$", label: "Billing" },
  { icon: "🖨", label: "Print" },
  { icon: "📦", label: "Cargo" },
  { icon: "🕘", label: "History" },
];

/**
 * Number, badges, author chip, the mockup's six-control icon bar, and the out-of-scope action
 * buttons.
 *
 * The amber "Actual ≠ Expected" pill is gated on `delta.hasDelta`, not `hasAlert` — the two are
 * independent. `StatusBadge` already handles the `hasAlert` override on its own; this pill is a
 * second, unrelated signal that sits next to it.
 */
export function OrderDetailHeader({ order }: OrderDetailHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          href="/orders"
          aria-label="Back to orders"
          className="inline-flex h-[30px] items-center rounded-md border border-border bg-white px-2.5 text-sm text-ink hover:bg-page"
        >
          ←
        </Link>
        <span className="text-[13px] text-muted">Order#:</span>
        <strong className="text-[15px] text-ink">{order.number}</strong>
        <TypeBadge type={order.type} />
        <StatusBadge status={order.status} type={order.type} hasAlert={order.hasAlert} />
        {order.delta.hasDelta && (
          <span className="inline-block rounded-full bg-amber-surface px-2 py-[3px] text-[10px] font-bold tracking-[0.3px] text-amber-ink uppercase">
            ⚠ Actual ≠ Expected
          </span>
        )}
        {order.refNumber && (
          <span className="text-[11px] text-muted">
            Ref N: <span className="font-bold text-ink">{order.refNumber}</span>
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-2xl border border-border bg-page py-[3px] pr-2.5 pl-1 text-[11.5px] font-bold text-ink">
          <span className="font-medium text-muted-soft">by</span>
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0EA5E9] text-[9px] font-extrabold text-white">
            {order.createdBy.initials}
          </span>
          {order.createdBy.name}
          <span className="rounded-[3px] bg-info-bg px-[5px] py-px text-[9px] font-extrabold tracking-[0.3px] text-info-ink uppercase">
            {getRoleLabel(order.createdBy.role)}
          </span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Counts are real data from the API; only the click is out of scope. */}
        <button type="button" disabled title="Out of scope" aria-label="Comments" className={DISABLED_BUTTON}>
          💬 {order.commentsCount}
        </button>
        <button type="button" disabled title="Out of scope" aria-label="Photos" className={DISABLED_BUTTON}>
          📷 {order.photosCount}
          {order.photosLimit > 0 && `/${order.photosLimit}`}
        </button>
        {OUT_OF_SCOPE_ICONS.map(({ icon, label }) => (
          <button key={label} type="button" disabled title="Out of scope" aria-label={label} className={DISABLED_BUTTON}>
            {icon}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled
            title="Out of scope"
            className="cursor-not-allowed rounded-md border border-border bg-white px-3 py-[7px] text-xs font-semibold text-muted"
          >
            📷 Share QR
          </button>
          <button
            type="button"
            disabled
            title="Out of scope"
            className="cursor-not-allowed rounded-md bg-blue/50 px-3 py-[7px] text-xs font-semibold text-white"
          >
            📥 BOL PDF
          </button>
          <button
            type="button"
            disabled
            title="Out of scope"
            className="cursor-not-allowed rounded-md bg-blue/50 px-3 py-[7px] text-xs font-semibold text-white"
          >
            ✏️ Edit
          </button>
        </div>
      </div>
    </div>
  );
}
