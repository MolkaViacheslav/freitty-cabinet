import Link from "next/link";

type Breakdown = { count: number; label: string; detail: string | null };

type NeedAttentionCardProps = {
  value: number;
  breakdown: Breakdown[];
  href: string;
};

// The mockup gives the two chips different tints; which chip is which is decided by the service,
// not here, so the tint follows the position in the breakdown rather than a hardcoded label match.
const CHIP_STYLES = ["bg-[#FECACA] text-[#7F1D1D]", "bg-[#FED7AA] text-[#9A3412]"];

/**
 * The merged "Awaiting Action + Alerts" KPI from docs/mockup.html — spans two grid slots and has
 * its own gradient, so it does not reuse KpiCard.
 *
 * The breakdown is rendered in the order the service returns it (alert first, then awaiting your
 * action). That is deliberate: DECISIONS.md B5 swaps the two numbers relative to the mockup,
 * because the Alerts tab count is the harder-fixed number. Nothing here re-derives or re-orders
 * them — if the data changes, the card follows.
 */
export function NeedAttentionCard({ value, breakdown, href }: NeedAttentionCardProps) {
  return (
    <Link
      href={href}
      className="relative col-span-2 rounded-card border border-border border-t-[3px] border-t-[#DC2626] bg-linear-to-r from-[#FEF2F2] to-[#FEE2E2] px-4 py-3.5"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#B8142A] uppercase">
        ⚠ Need Attention
      </div>
      <div className="mt-0.5 flex items-baseline gap-[18px]">
        <div>
          <div className="text-2xl font-bold text-[#B8142A]">{value}</div>
          <div className="text-[10px] font-bold tracking-[0.06em] text-[#991B1B] uppercase">Total</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {breakdown.map((item, i) => (
            <span
              key={item.label}
              className={`rounded-lg px-2 py-[3px] text-[11px] font-bold ${CHIP_STYLES[i] ?? CHIP_STYLES[0]}`}
            >
              {item.count} · {item.label}
              {item.detail && ` (${item.detail})`}
            </span>
          ))}
          {breakdown.length === 0 && (
            <span className="text-[11px] font-semibold text-[#991B1B]">Nothing needs attention</span>
          )}
        </div>
      </div>
      <div className="absolute right-3 bottom-2.5 text-[11px] font-extrabold text-[#B8142A]">Open list →</div>
    </Link>
  );
}
