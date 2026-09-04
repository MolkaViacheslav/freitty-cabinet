import type { PalletUnit } from "@prisma/client";
import type { OrderDetailDTO } from "@/server/dto/orders.dto";
import { Card } from "@/components/ui/Card";
import { getUnitLabel } from "@/lib/status";

/**
 * Expected (BOL) vs Actual (warehouse). Both numbers come straight from `order.delta`
 * (`computeDelta` in orders.dto.ts) and are never recomputed here.
 *
 * The two cards are exported separately rather than as one fragment: they are siblings in the
 * page's three-column grid next to the warehouse note, and a component that silently emits two
 * grid items forces the parent's column count to match its insides.
 */

type ExpectedCardProps = {
  expected: number;
  unit: PalletUnit;
  xlQty: number;
};

/**
 * The schema stores a single `actualQty` and no XL counterpart, so the delta can only be about
 * the primary unit. The extra XL pallets are therefore shown beside the number instead of being
 * left out: without them this card read "15 · Standard" while the grid above it read
 * "15 × Std + 3 × XL", and the same screen contradicted itself.
 */
export function ExpectedCard({ expected, unit, xlQty }: ExpectedCardProps) {
  return (
    <Card>
      <div className="mb-1.5 text-[10px] font-bold tracking-wide text-muted uppercase">Expected (BOL)</div>
      <div className="flex items-baseline gap-1.5 text-[26px] font-bold text-ink">
        {expected}
        {xlQty > 0 && (
          <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-bold text-ink-soft">+{xlQty} XL</span>
        )}
      </div>
      <div className="text-[11px] text-muted">
        {getUnitLabel(unit)}
        {xlQty > 0 && " · XL counted separately"}
      </div>
    </Card>
  );
}

/**
 * `delta.hasDelta` is independent of `order.hasAlert`: an order can have a quantity delta without
 * being flagged, and vice versa. When `actual` is null the order has not been counted at the
 * warehouse yet — no delta, no amber styling.
 */
export function ActualCard({ delta }: { delta: OrderDetailDTO["delta"] }) {
  return (
    <Card className={delta.hasDelta ? "border-amber-border bg-amber-surface" : ""}>
      <div
        className={`mb-1.5 text-[10px] font-bold tracking-wide uppercase ${delta.hasDelta ? "text-amber-ink" : "text-muted"}`}
      >
        Actual (warehouse)
      </div>
      {delta.actual === null ? (
        <>
          <div className="text-[26px] font-bold text-muted">—</div>
          <div className="text-[11px] text-muted">Not counted yet</div>
        </>
      ) : (
        <>
          <div
            className={`flex items-baseline gap-1.5 text-[26px] font-bold ${delta.hasDelta ? "text-amber-ink" : "text-ink"}`}
          >
            {delta.actual}
            {delta.hasDelta && (
              <span className="rounded-full bg-delta px-2 py-0.5 text-xs font-bold text-white">
                {delta.diff > 0 ? `+${delta.diff}` : delta.diff}
              </span>
            )}
          </div>
          <div className={`text-[11px] ${delta.hasDelta ? "text-amber-ink" : "text-muted"}`}>
            {delta.hasDelta ? "Delta from BOL · read-only" : "Matches BOL"}
          </div>
        </>
      )}
    </Card>
  );
}
