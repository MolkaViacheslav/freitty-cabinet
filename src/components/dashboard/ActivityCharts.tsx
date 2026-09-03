"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ActivityBucket = {
  key: string;
  startsAt: string;
  completed: number;
  spend: number;
};

type ActivityChartsProps = {
  buckets: ActivityBucket[];
  completedTotalLabel: string;
  spendTotalLabel: string;
};

const GREEN = "#16A34A";
const RED = "#ED1C2E";
const GRID = "#F1F5F9";
const AXIS = "#94A3B8";

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  fontSize: 12,
  padding: "6px 10px",
} as const;

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ChartHeading({ title, total, color }: { title: string; total: string; color: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <span className="text-xs font-semibold tracking-wide text-[#64748B] uppercase">{title}</span>
      <span className="text-xl font-extrabold" style={{ color }}>
        {total} <span className="text-[11px] font-semibold text-[#64748B]">last 30d</span>
      </span>
    </div>
  );
}

/**
 * The only "use client" component on the Dashboard (CLAUDE.md: `"use client"` goes on the
 * smallest possible component, never on a page). Recharts needs the browser; everything around
 * these two charts stays a Server Component.
 *
 * This component computes nothing — `buckets` arrives already aggregated, zero-filled and
 * serialized by dashboard.service.ts, so switching granularity just hands it a different array.
 */
export function ActivityCharts({ buckets, completedTotalLabel, spendTotalLabel }: ActivityChartsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <ChartHeading title="Completed orders" total={completedTotalLabel} color={GREEN} />
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="key" tick={{ fontSize: 9, fill: AXIS }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: AXIS }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(22,163,74,0.06)" }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value) => [Number(value), "Completed"]}
            />
            <Bar dataKey="completed" fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <ChartHeading title="Spend" total={spendTotalLabel} color={RED} />
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={RED} stopOpacity={0.22} />
                <stop offset="100%" stopColor={RED} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="key" tick={{ fontSize: 9, fill: AXIS }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 9, fill: AXIS }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [money(Number(value)), "Spend"]} />
            <Area
              type="monotone"
              dataKey="spend"
              stroke={RED}
              strokeWidth={2}
              fill="url(#spendFill)"
              dot={{ r: 3, fill: RED }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
