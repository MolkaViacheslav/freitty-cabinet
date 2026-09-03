import { formatMoney, formatPercent } from "@/lib/format";

type InsightsRowProps = {
  completedChangePercent: number;
  totalSpend30d: number;
  avgPerOrder: number;
  bestWeek: { key: string; spend: number };
};

/**
 * The strip under the charts. Every figure is computed by dashboard.service.ts from real rows —
 * the mockup's "+18% ... same as last month" pair contradicted itself and was a placeholder
 * (DECISIONS.md B8), so these numbers are expected to differ from it.
 *
 * `bestWeek` likewise reports whichever week actually peaked (currently W1, not the mockup's W7 —
 * see data-model.md §2.6); it is read from the data, not pinned to the wireframe.
 */
export function InsightsRow({ completedChangePercent, totalSpend30d, avgPerOrder, bestWeek }: InsightsRowProps) {
  const changeColor =
    completedChangePercent > 0 ? "text-[#16A34A]" : completedChangePercent < 0 ? "text-[#DC2626]" : "text-[#64748B]";

  return (
    <div className="mt-3.5 flex flex-wrap gap-4 rounded-md bg-[#F1F5F9] px-3.5 py-2.5 text-xs text-[#475569]">
      <span>
        📈 <strong className={changeColor}>{formatPercent(completedChangePercent)}</strong> completed orders vs previous
        month
      </span>
      <span>
        💰 <strong className="text-red">{formatMoney(totalSpend30d)}</strong> spent · avg {formatMoney(avgPerOrder)}
        /order
      </span>
      <span>
        ⭐ Best week: <strong className="text-ink">{bestWeek.key}</strong> (peak spend {formatMoney(bestWeek.spend)})
      </span>
    </div>
  );
}
