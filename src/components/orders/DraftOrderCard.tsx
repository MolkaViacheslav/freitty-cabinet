import type { OrderListItemDTO } from "@/server/dto/orders.dto";
import { getOrderTypeLabel } from "@/lib/status";
import { formatDate } from "@/lib/format";

type DraftOrderCardProps = {
  order: OrderListItemDTO;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted">{label}</div>
      <div className="font-semibold text-ink">{value}</div>
    </div>
  );
}

/**
 * A draft renders as its own kind of card (dashed border, dimmed) rather than as a normal one with
 * empty fields — the mockup treats it as "incomplete", not as an order you can act on.
 *
 * The card is intentionally NOT a link and "Continue editing →" is inert: editing is a mutation,
 * and mutations are out of scope (CLAUDE.md), so the affordance is shown disabled rather than
 * faked or wired to a page that cannot do anything.
 */
export function DraftOrderCard({ order }: DraftOrderCardProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-dashed border-border bg-white p-4 opacity-75">
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <div data-order-number className="text-[15px] font-bold text-navy">
            {order.number}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{getOrderTypeLabel(order.type)} · incomplete</div>
        </div>
        <span className="rounded-full bg-[#E5E7EB] px-2 py-[3px] text-[10px] font-bold tracking-[0.3px] text-[#374151] uppercase">
          Draft
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Field label="Hub" value={order.hub.name} />
        <Field label="Date" value={formatDate(new Date(order.scheduledAt))} />
        {/* A draft legitimately has no quantity or carrier yet — "—" is the real value, not a gap. */}
        <Field label="Q-ty" value={order.declaredQty > 0 ? order.quantityLabel : "—"} />
        <Field label="Carrier" value={order.carrierName ?? "—"} />
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-border pt-2.5 text-xs">
        <span className="cursor-not-allowed font-semibold text-[#9CA3AF]" title="Out of scope">
          Continue editing →
        </span>
        <span className="cursor-not-allowed text-[#B6BCC6]" title="Out of scope">
          🗑
        </span>
      </div>
    </div>
  );
}
