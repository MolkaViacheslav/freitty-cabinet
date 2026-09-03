export type KpiTrend = {
  direction: "up" | "down" | "flat";
  /** Fully composed trend text, e.g. "2 this week" or "20% vs last month" — the caller decides
   * whether the value is a raw count or a percent, KpiCard only adds the arrow and color. */
  text: string;
};

type KpiAccent = "blue" | "green" | "orange" | "red";

const ACCENT_BORDER: Record<KpiAccent, string> = {
  blue: "border-t-[3px] border-t-[#2E75B6]",
  green: "border-t-[3px] border-t-[#16A34A]",
  orange: "border-t-[3px] border-t-[#EA580C]",
  red: "border-t-[3px] border-t-[#DC2626]",
};

const TREND_COLOR: Record<KpiTrend["direction"], string> = {
  up: "text-[#16A34A]",
  down: "text-[#DC2626]",
  flat: "text-muted",
};

const TREND_ARROW: Record<KpiTrend["direction"], string> = { up: "▲", down: "▼", flat: "⟶" };

type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  trend?: KpiTrend;
  accent?: KpiAccent;
  className?: string;
};

/** Mirrors docs/mockup.html's .kpi block: uppercase label, big value, colored trend line. */
export function KpiCard({ label, value, trend, accent = "blue", className = "" }: KpiCardProps) {
  return (
    <div className={`rounded-card border border-border bg-white px-4 py-3.5 ${ACCENT_BORDER[accent]} ${className}`}>
      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-ink">{value}</div>
      {trend && (
        <div className={`mt-1 text-[11px] ${TREND_COLOR[trend.direction]}`}>
          {TREND_ARROW[trend.direction]} {trend.text}
        </div>
      )}
    </div>
  );
}
