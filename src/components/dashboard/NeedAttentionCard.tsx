import Link from "next/link";
import type { NeedAttentionBucket } from "@/server/services/dashboard.service";

type NeedAttentionCardProps = {
  value: number;
  breakdown: NeedAttentionBucket[];
  /** The Alerts tab. Also where the alert chip points — that tab filters to exactly that bucket. */
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
 *
 * The card itself is not the link (a nested `<a>` inside it would be invalid HTML). Each chip
 * links on its own, and where it goes depends on the bucket, not on the chip text:
 *
 * - **alert** → the Alerts tab, which filters to exactly this bucket. It used to link to
 *   `?search=<representativeAlert>`, which sent "2 · alert" to a page showing one order. The
 *   number in `detail` is an example of the bucket (api-contract.md), never its contents.
 * - **awaiting-action** → `?search=<orderNumber>`, because no tab or filter selects
 *   `awaitingClientAction` and inventing one is out of scope. That is exact only while the count
 *   is 1; if this bucket ever grows past one order it needs a real filter, not a wider search.
 *
 * "Open list →" sits in normal flow below the breakdown, not absolutely positioned to the card's
 * corner: on a narrow screen the chips wrap to a second line, and an absolutely positioned link
 * doesn't grow the card to make room for itself — it just overlapped the wrapped text.
 */
export function NeedAttentionCard({ value, breakdown, href }: NeedAttentionCardProps) {
  return (
    <div className="col-span-2 rounded-card border border-border border-t-[3px] border-t-[#DC2626] bg-linear-to-r from-[#FEF2F2] to-[#FEE2E2] px-4 py-3.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#B8142A] uppercase">
        ⚠ Need Attention
      </div>
      <div className="mt-0.5 flex items-baseline gap-[18px]">
        <div>
          <div className="text-2xl font-bold text-[#B8142A]">{value}</div>
          <div className="text-[10px] font-bold tracking-[0.06em] text-[#991B1B] uppercase">Total</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {breakdown.map((item, i) => {
            const chip = (
              <span className={`rounded-lg px-2 py-[3px] text-[11px] font-bold ${CHIP_STYLES[i] ?? CHIP_STYLES[0]}`}>
                {item.count} · {item.label}
                {item.detail && ` (${item.detail})`}
              </span>
            );
            // Alerts have a tab that selects the whole bucket; awaiting-action does not, so it
            // falls back to its representative order. See the note above the component.
            const target =
              item.kind === "alert" ? href : item.orderNumber ? `/orders?search=${item.orderNumber}` : null;
            return target ? (
              <Link key={item.label} href={target} className="hover:opacity-80">
                {chip}
              </Link>
            ) : (
              <span key={item.label}>{chip}</span>
            );
          })}
          {breakdown.length === 0 && (
            <span className="text-[11px] font-semibold text-[#991B1B]">Nothing needs attention</span>
          )}
        </div>
      </div>
      <div className="mt-2 text-right">
        <Link href={href} className="text-[11px] font-extrabold text-[#B8142A] hover:underline">
          Open list →
        </Link>
      </div>
    </div>
  );
}
